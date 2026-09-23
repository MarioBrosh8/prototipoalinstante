/*
  The hero's live print: PROIN's lattice sphere lamp, generated in code (no
  model download), printed layer by layer by a hotend shaped like their logo.

  - Layers build up with a hot edge; the walls carry faint layer lines.
  - Picking a filament mid-print changes the colour from that layer up, like
    a real filament swap. After the print it recolours the whole lamp.
  - When the print finishes the lamp switches on and its light leaks through
    the lattice, throwing the diamond pattern onto the bed and the walls
    (computed analytically, no shadow maps).
  - Drag to turn it (momentum and rubber-banded tilt), arrows from the keyboard.

  Only the classes imported below end up in the bundle. The loop only runs
  while the viewer is on screen and the tab is visible.
*/
import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  Color,
  CylinderGeometry,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Matrix3,
  Mesh,
  NeutralToneMapping,
  PerspectiveCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  SphereGeometry,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";
import { DEFAULT_FILAMENT, FILAMENTS, type Filament } from "./filaments";

// Lamp geometry (1 unit = 10 cm).
const BASE_H = 0.36;
const R = 0.86;
const LAT_MIN = -0.87; // where the sphere sits in the base (about -50 deg)
const LAT_MAX = 1.08; // the open top (about 62 deg)
const CY = BASE_H - R * Math.sin(LAT_MIN);
const TOP = CY + R * Math.sin(LAT_MAX) + 0.03;
const RIBS = 14;
const TWIST = 1;
const RIB_W = 0.054;
const RIB_T = 0.05;
const LAYERS = 900; // what the HUD reports: 0.2 mm layers on an 18 cm lamp
const MAX_SWAPS = 8;

const PRINT_SECONDS = 11;
const HEAT_SECONDS = 0.7;
const PARK_SECONDS = 1.1;
const UNPRINT_SECONDS = 0.75;

type Phase = "heating" | "printing" | "parking" | "done" | "unprinting";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

// ---------------------------------------------------------------------------
// Geometry

type Frame = { c: Vector3; r: Vector3; b: Vector3 };

/** Sweeps a rectangular section (half width along b, thickness along -r). */
function sweep(frames: Frame[], halfW: number, thick: number, pos: number[], nor: number[], idx: number[]) {
  const start = pos.length / 3;
  const v = new Vector3();
  const push = (p: Vector3, n: Vector3, s = 1) => {
    pos.push(p.x, p.y, p.z);
    nor.push(n.x * s, n.y * s, n.z * s);
  };
  for (const { c, r, b } of frames) {
    const o1 = c.clone().addScaledVector(b, halfW);
    const o2 = c.clone().addScaledVector(b, -halfW);
    const i1 = v.copy(o1).addScaledVector(r, -thick).clone();
    const i2 = o2.clone().addScaledVector(r, -thick);
    push(o1, r);
    push(o2, r);
    push(i2, r, -1);
    push(i1, r, -1);
    push(i1, b);
    push(o1, b);
    push(o2, b, -1);
    push(i2, b, -1);
  }
  for (let s = 0; s < frames.length - 1; s++) {
    for (let face = 0; face < 4; face++) {
      const a = start + s * 8 + face * 2;
      const b = a + 1;
      const c = a + 8;
      const d = b + 8;
      idx.push(a, c, b, b, c, d);
    }
  }
}

function latticeGeometry(steps: number) {
  const pos: number[] = [];
  const nor: number[] = [];
  const idx: number[] = [];
  const centre = new Vector3(0, CY, 0);

  const rib = (theta0: number, dir: 1 | -1) => {
    const frames: Frame[] = [];
    for (let s = 0; s <= steps; s++) {
      const lat = LAT_MIN + ((LAT_MAX - LAT_MIN) * s) / steps;
      const th = theta0 + dir * TWIST * lat;
      const cl = Math.cos(lat);
      const sl = Math.sin(lat);
      const r = new Vector3(cl * Math.cos(th), sl, cl * Math.sin(th));
      const t = new Vector3(
        -sl * Math.cos(th) - cl * Math.sin(th) * dir * TWIST,
        cl,
        -sl * Math.sin(th) + cl * Math.cos(th) * dir * TWIST,
      ).normalize();
      const b = new Vector3().crossVectors(t, r).normalize();
      frames.push({ c: centre.clone().addScaledVector(r, R), r, b });
    }
    sweep(frames, RIB_W / 2, RIB_T, pos, nor, idx);
  };

  for (let i = 0; i < RIBS; i++) {
    rib((2 * Math.PI * i) / RIBS, 1);
    rib((2 * Math.PI * i) / RIBS + Math.PI / RIBS, -1);
  }

  const ring = (lat: number, height: number) => {
    const frames: Frame[] = [];
    const n = 96;
    for (let s = 0; s <= n; s++) {
      const th = (2 * Math.PI * s) / n;
      const cl = Math.cos(lat);
      const sl = Math.sin(lat);
      const r = new Vector3(cl * Math.cos(th), sl, cl * Math.sin(th));
      const north = new Vector3(-sl * Math.cos(th), cl, -sl * Math.sin(th));
      frames.push({ c: centre.clone().addScaledVector(r, R), r, b: north });
    }
    sweep(frames, height / 2, RIB_T, pos, nor, idx);
  };
  ring(LAT_MIN + 0.02, 0.07);
  ring(LAT_MAX - 0.015, 0.06);

  const geo = new BufferGeometry();
  geo.setAttribute("position", new Float32BufferAttribute(pos, 3));
  geo.setAttribute("normal", new Float32BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

// ---------------------------------------------------------------------------
// Shaders

const VERT = /* glsl */ `
  varying vec3 vObj;
  varying vec3 vW;
  varying vec3 vN;
  void main() {
    vObj = position;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vW = w.xyz;
    vN = normalize(mat3(modelMatrix) * normal);
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const COMMON = /* glsl */ `
  #define PI 3.141592653589793
  uniform vec3 uKeyDir;
  uniform vec3 uSky;
  uniform vec3 uGround;
  uniform vec3 uRim;
  uniform float uLamp;
  uniform vec3 uLampPos;
  uniform vec3 uLampColor;
  uniform mat3 uInvRot;
  varying vec3 vObj;
  varying vec3 vW;
  varying vec3 vN;

  // How much of the bulb's light gets out through the lattice in direction d
  // (lamp space). Same parametrisation as the rib geometry.
  float lattice(vec3 d, float soft) {
    float lat = asin(clamp(d.y, -1.0, 1.0));
    if (lat < ${LAT_MIN.toFixed(4)}) return 0.0;
    if (lat > ${(LAT_MAX - 0.03).toFixed(4)}) return 1.0;
    float th = atan(d.z, d.x);
    float c = max(cos(lat), 0.05);
    float cell = ${R.toFixed(4)} * c * 2.0 * PI / ${RIBS.toFixed(1)};
    float halfW = 0.5 * ${RIB_W.toFixed(4)} * sqrt(1.0 + ${TWIST.toFixed(2)} * ${TWIST.toFixed(2)} * c * c) / cell;
    float s = soft / cell;
    float a = (th - ${TWIST.toFixed(2)} * lat) * ${RIBS.toFixed(1)} / (2.0 * PI);
    float b = (th + ${TWIST.toFixed(2)} * lat - PI / ${RIBS.toFixed(1)}) * ${RIBS.toFixed(1)} / (2.0 * PI);
    float ta = smoothstep(halfW - s, halfW + s, abs(fract(a + 0.5) - 0.5));
    float tb = smoothstep(halfW - s, halfW + s, abs(fract(b + 0.5) - 0.5));
    return ta * tb;
  }

  vec3 lampLight(vec3 n) {
    if (uLamp < 0.002) return vec3(0.0);
    vec3 d = vW - uLampPos;
    float dist = length(d);
    vec3 dir = d / dist;
    float ndl = max(dot(n, -dir), 0.0);
    float t = lattice(uInvRot * dir, 0.01 + dist * 0.007);
    return uLampColor * (uLamp * t * ndl * 0.95 / (1.0 + dist * dist * 0.42));
  }

  vec3 ambient(vec3 n) {
    return mix(uGround, uSky, n.y * 0.5 + 0.5);
  }
`;

const FRAG_PRINT = /* glsl */ `
  ${COMMON}
  uniform vec3 uColors[${MAX_SWAPS}];
  uniform vec2 uMats[${MAX_SWAPS}];
  uniform float uChangeY[${MAX_SWAPS}];
  uniform int uCount;
  uniform float uPrintY;
  uniform float uPrinting;
  uniform vec3 uHot;
  uniform float uLayer;

  void main() {
    float y = vObj.y;
    if (y > uPrintY) discard;

    vec3 base = uColors[0];
    vec2 mat = uMats[0];
    for (int i = 1; i < ${MAX_SWAPS}; i++) {
      if (i >= uCount) break;
      if (y >= uChangeY[i]) { base = uColors[i]; mat = uMats[i]; }
    }

    vec3 V = normalize(cameraPosition - vW);
    vec3 n = normalize(vN);
    if (dot(n, V) < 0.0) n = -n;

    // Layer lines: a ridge per layer on vertical walls, faded out when the
    // lines get denser than the pixels.
    float fy = y / uLayer;
    float fade = clamp(1.0 - fwidth(fy) * 2.2, 0.0, 1.0);
    float ridge = abs(fract(fy) - 0.5) * 2.0;
    float wall = 1.0 - abs(n.y);
    n = normalize(n + vec3(0.0, (0.5 - ridge) * 0.5 * fade * wall, 0.0));
    float seam = smoothstep(0.72, 1.0, ridge) * fade * wall;

    #ifdef VENTS
      float ang = atan(vObj.z, vObj.x);
      float sec = fract((ang - ${(3 * Math.PI / 8).toFixed(5)}) / ${(Math.PI / 4).toFixed(5)} + 0.5);
      float vent = (1.0 - smoothstep(0.1, 0.125, abs(sec - 0.5)))
        * step(0.07, y) * step(y, 0.27) * step(0.6, wall);
    #endif

    vec3 H = normalize(uKeyDir + V);
    float ndl = max(dot(n, uKeyDir), 0.0);
    vec3 col = base * (ambient(n) + ndl * 1.1);
    col *= 1.0 - seam * 0.2;
    col += pow(max(dot(n, H), 0.0), 34.0) * mat.y;
    col += uRim * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.5;

    vec3 Ld = uLampPos - vW;
    float d2 = dot(Ld, Ld);
    float lit = max(dot(n, Ld * inversesqrt(d2)), 0.0);
    col += base * uLampColor * uLamp * lit * 2.8 / (1.0 + d2 * 1.4);
    col += uLampColor * uLamp * mat.x * 0.55 / (1.0 + d2 * 1.6);

    #ifdef VENTS
      col = mix(col, col * 0.22, vent);
      col += vent * uLampColor * uLamp * 1.6;
    #endif

    float hot = smoothstep(uPrintY - 0.045, uPrintY, y) * uPrinting;
    col = mix(col, uHot * 2.4, hot * 0.8);

    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FRAG_SOLID = /* glsl */ `
  ${COMMON}
  uniform vec3 uColor;
  uniform float uSpec;
  uniform float uEmit;

  void main() {
    vec3 V = normalize(cameraPosition - vW);
    vec3 n = normalize(vN);
    if (dot(n, V) < 0.0) n = -n;
    vec3 H = normalize(uKeyDir + V);
    vec3 col = uColor * (ambient(n) + max(dot(n, uKeyDir), 0.0) * 1.1);
    col += pow(max(dot(n, H), 0.0), 30.0) * uSpec;
    col += uRim * pow(1.0 - max(dot(n, V), 0.0), 3.0) * 0.45;
    col += uColor * uEmit;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FRAG_PLATE = /* glsl */ `
  ${COMMON}
  uniform vec3 uPlate;

  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
  }

  void main() {
    vec3 V = normalize(cameraPosition - vW);
    vec3 n = normalize(vN);
    vec3 col = uPlate * 0.55;
    if (n.y > 0.5) {
      vec2 p = vW.xz;
      float speck = hash(floor(p * 140.0)) * 0.12;
      vec2 g = abs(fract(p * 2.0) - 0.5);
      vec2 fw = max(fwidth(p * 2.0), vec2(1e-4));
      float grid = 1.0 - smoothstep(0.0, 1.5, min(g.x / fw.x, g.y / fw.y));
      col = uPlate * (0.8 + speck) + grid * 0.018;
      vec3 H = normalize(uKeyDir + V);
      col += pow(max(dot(n, H), 0.0), 60.0) * 0.12;
    }
    col *= ambient(n) + max(dot(n, uKeyDir), 0.0) * 0.8;
    col += lampLight(n) * 0.9;
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FRAG_ROOM = /* glsl */ `
  ${COMMON}
  uniform vec3 uTop;
  uniform vec3 uBottom;
  uniform float uWall;

  void main() {
    vec3 n = normalize(vN);
    vec3 col;
    if (uWall > 0.5) {
      col = mix(uBottom, uTop, smoothstep(-0.5, 5.5, vW.y));
      col *= 1.0 - smoothstep(3.0, 9.0, abs(vW.x)) * 0.5;
    } else {
      col = uBottom * (1.0 - smoothstep(1.5, 9.0, length(vW.xz)) * 0.65);
    }
    col += lampLight(n) * mix(0.5, 0.24, uWall);
    gl_FragColor = vec4(col, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const FRAG_GLOW = /* glsl */ `
  uniform float uAmount;
  uniform vec3 uTint;
  uniform float uTight;
  varying vec2 vUv;
  void main() {
    float r = length(vUv - 0.5) * 2.0;
    float g = exp(-r * r * 3.5) * 0.55 + exp(-r * r * uTight) * 1.4;
    gl_FragColor = vec4(uTint * g * uAmount, 1.0);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const VERT_UV = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

// ---------------------------------------------------------------------------

export type PrinterController = { destroy(): void };

export function mount(root: HTMLElement): PrinterController {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const host = root.querySelector<HTMLElement>("[data-canvas]") ?? root;
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  host.appendChild(canvas);

  const lowPower =
    (navigator.hardwareConcurrency || 8) <= 4 || ((navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8) <= 4;
  const dpr = Math.min(window.devicePixelRatio || 1, lowPower ? 1.25 : 1.75);

  const renderer = new WebGLRenderer({
    canvas,
    antialias: dpr < 2,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(dpr);
  renderer.toneMapping = NeutralToneMapping;
  renderer.toneMappingExposure = 1.04;
  renderer.setClearColor(0x0c0812, 1);

  const scene = new Scene();
  const camera = new PerspectiveCamera(28, 1, 0.1, 60);
  const target = new Vector3(0, 1.02, 0);

  // Shared lighting uniforms (same objects in every material).
  const shared = {
    uKeyDir: { value: new Vector3(-0.55, 0.85, 0.65).normalize() },
    uSky: { value: new Color("#3a2854") },
    uGround: { value: new Color("#130c1a") },
    uRim: { value: new Color("#b98ae8") },
    uLamp: { value: 0 },
    uLampPos: { value: new Vector3(0, CY, 0) },
    uLampColor: { value: new Color("#ffb468") },
    uInvRot: { value: new Matrix3() },
  };

  // Room: floor and back wall pick up the light that leaks out of the lamp.
  const roomMat = (wall: boolean) =>
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_ROOM,
      uniforms: {
        ...shared,
        uTop: { value: new Color("#231634") },
        uBottom: { value: new Color("#120b1b") },
        uWall: { value: wall ? 1 : 0 },
      },
    });
  const floor = new Mesh(new PlaneGeometry(40, 40).rotateX(-Math.PI / 2).translate(0, -0.075, 0), roomMat(false));
  const wall = new Mesh(new PlaneGeometry(40, 16).translate(0, 5, -4.2), roomMat(true));
  scene.add(floor, wall);

  const plate = new Mesh(
    new BoxGeometry(3.3, 0.075, 3.3).translate(0, -0.0375, 0),
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_PLATE,
      uniforms: { ...shared, uPlate: { value: new Color("#2b2731") } },
    }),
  );
  scene.add(plate);

  // The lamp turns on the bed like a turntable.
  const model = new Group();
  scene.add(model);

  const filamentState = {
    colors: Array.from({ length: MAX_SWAPS }, () => new Color()),
    targets: Array.from({ length: MAX_SWAPS }, () => new Color()),
    // x: translucency, y: specular
    mats: Array.from({ length: MAX_SWAPS }, () => new Vector2()),
    changeY: new Array<number>(MAX_SWAPS).fill(0),
    count: 1,
  };

  const printUniforms = {
    ...shared,
    uColors: { value: filamentState.colors },
    uMats: { value: filamentState.mats },
    uChangeY: { value: filamentState.changeY },
    uCount: { value: 1 },
    uPrintY: { value: 0 },
    uPrinting: { value: 0 },
    uHot: { value: new Color("#ff7a2a") },
    uLayer: { value: 0.017 },
  };

  const lattice = new Mesh(
    latticeGeometry(lowPower ? 40 : 56),
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_PRINT,
      uniforms: printUniforms,
      side: DoubleSide,
    }),
  );
  model.add(lattice);

  // Octagonal base with vents, printed first in copper like PROIN's lamp.
  const baseGeo = new CylinderGeometry(0.585, 0.64, BASE_H, 8, 1, true).toNonIndexed();
  baseGeo.computeVertexNormals();
  baseGeo.translate(0, BASE_H / 2, 0);
  const capGeo = new CylinderGeometry(0.585, 0.585, 0.02, 8, 1).toNonIndexed();
  capGeo.computeVertexNormals();
  capGeo.translate(0, BASE_H - 0.01, 0);
  const baseUniforms = {
    ...printUniforms,
    uColors: { value: [new Color("#a45f35"), ...filamentState.colors.slice(1)] },
    uMats: { value: [new Vector2(0.1, 0.2), ...filamentState.mats.slice(1)] },
    uCount: { value: 1 },
  };
  const baseMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG_PRINT,
    uniforms: baseUniforms,
    side: DoubleSide,
    defines: { VENTS: 1 },
  });
  model.add(new Mesh(baseGeo, baseMat), new Mesh(capGeo, baseMat));

  // Bulb and socket appear once the print is done.
  const bulbMat = new ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG_SOLID,
    uniforms: { ...shared, uColor: { value: new Color("#f3ece2") }, uSpec: { value: 0.4 }, uEmit: { value: 0 } },
  });
  const bulb = new Mesh(new SphereGeometry(0.13, 24, 16), bulbMat);
  bulb.position.set(0, CY, 0);
  const socket = new Mesh(
    new CylinderGeometry(0.05, 0.065, CY - 0.12 - BASE_H, 20).translate(0, (CY - 0.12 + BASE_H) / 2, 0),
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_SOLID,
      uniforms: { ...shared, uColor: { value: new Color("#cfc5bd") }, uSpec: { value: 0.3 }, uEmit: { value: 0 } },
    }),
  );
  const fixture = new Group();
  fixture.add(bulb, socket);
  fixture.visible = false;
  model.add(fixture);

  // Hotend modelled on the PROIN logo: block, heater block, nozzle.
  const hotend = new Group();
  const brand = (color: string, emit = 0) =>
    new ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG_SOLID,
      uniforms: { ...shared, uColor: { value: new Color(color) }, uSpec: { value: 0.35 }, uEmit: { value: emit } },
    });
  const nozzle = new Mesh(new CylinderGeometry(0.075, 0.018, 0.09, 20).translate(0, 0.045, 0), brand("#b98ae8"));
  const heater = new Mesh(new BoxGeometry(0.28, 0.14, 0.24).translate(0, 0.16, 0), brand("#8a3bc1"));
  const heaterBand = new Mesh(new BoxGeometry(0.19, 0.05, 0.245).translate(0, 0.165, 0), brand("#b98ae8", 0.05));
  const block = new Mesh(new BoxGeometry(0.5, 0.22, 0.34).translate(0, 0.34, 0), brand("#8a3bc1"));
  const blockBand = new Mesh(new BoxGeometry(0.4, 0.075, 0.345).translate(0, 0.37, 0), brand("#b98ae8", 0.05));
  const tube = new Mesh(new CylinderGeometry(0.03, 0.03, 3, 12).translate(0, 1.95, 0), brand("#e8e2ee"));
  hotend.add(nozzle, heater, heaterBand, block, blockBand, tube);
  // Lives in world space: it follows the turning lamp while printing, then
  // parks and stays put.
  scene.add(hotend);

  // Soft glows: the bulb, and molten plastic at the nozzle tip.
  const glowMat = (tint: string, tight: number) =>
    new ShaderMaterial({
      vertexShader: VERT_UV,
      fragmentShader: FRAG_GLOW,
      uniforms: { uAmount: { value: 0 }, uTint: { value: new Color(tint) }, uTight: { value: tight } },
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
    });
  const lampGlow = new Mesh(new PlaneGeometry(2.3, 2.3), glowMat("#ffb468", 30));
  lampGlow.renderOrder = 2;
  const tipGlow = new Mesh(new PlaneGeometry(0.42, 0.42), glowMat("#ff8a3a", 18));
  tipGlow.renderOrder = 3;
  scene.add(lampGlow, tipGlow);

  // -------------------------------------------------------------------------
  // DOM

  // The controls live beside the chamber (below it on phones), so look up
  // UI from the wrapper that holds both.
  const ui = root.closest<HTMLElement>("[data-printer-ui]") ?? root;
  const $ = <T extends Element>(sel: string) => ui.querySelector<T>(sel);
  const statusEl = $<HTMLElement>("[data-hud-status]");
  const layerEl = $<HTMLElement>("[data-hud-layer]");
  const barEl = $<HTMLElement>("[data-hud-bar]");
  const filamentEl = $<HTMLElement>("[data-hud-filament]");
  const lightBtn = $<HTMLButtonElement>("[data-light]");
  const replayBtn = $<HTMLButtonElement>("[data-replay]");
  const hint = $<HTMLElement>("[data-hint]");
  const swatches = Array.from(ui.querySelectorAll<HTMLButtonElement>("[data-filament]"));
  const stage = $<HTMLElement>("[data-stage]") ?? root;

  let current: Filament = FILAMENTS.find((f) => f.id === DEFAULT_FILAMENT) ?? FILAMENTS[0];

  const applyMaterial = (i: number, f: Filament) => {
    filamentState.mats[i].set(f.transl, f.spec);
  };

  const resetFilament = (f: Filament) => {
    filamentState.count = 1;
    filamentState.changeY[0] = -1;
    filamentState.colors[0].set(f.color);
    filamentState.targets[0].set(f.color);
    applyMaterial(0, f);
    printUniforms.uCount.value = 1;
  };
  resetFilament(current);

  const selectFilament = (f: Filament) => {
    current = f;
    const printY = printUniforms.uPrintY.value;
    if (phase === "printing" && printY > 0.02 && filamentState.count < MAX_SWAPS) {
      // Filament swap: everything printed from here on uses the new colour.
      const i = filamentState.count++;
      filamentState.changeY[i] = printY;
      filamentState.colors[i].set(f.color);
      filamentState.targets[i].set(f.color);
      applyMaterial(i, f);
      printUniforms.uCount.value = filamentState.count;
    } else if (phase === "printing" || phase === "heating") {
      resetFilament(f);
    } else {
      // Finished lamp: recolour it all, with a short blend.
      for (let i = 0; i < filamentState.count; i++) {
        filamentState.targets[i].set(f.color);
        applyMaterial(i, f);
      }
    }
    swatches.forEach((s) => {
      const on = s.dataset.filament === f.id;
      s.setAttribute("aria-checked", String(on));
      s.tabIndex = on ? 0 : -1;
    });
    if (filamentEl) filamentEl.textContent = f.name;
    wake();
  };

  swatches.forEach((s, i) => {
    s.addEventListener("click", () => {
      const f = FILAMENTS.find((x) => x.id === s.dataset.filament);
      if (f) selectFilament(f);
    });
    s.addEventListener("keydown", (e) => {
      const dir = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      const next = swatches[(i + dir + swatches.length) % swatches.length];
      next.focus();
      next.click();
    });
  });

  let lampWanted = true;
  let lampTarget = 0;
  const setLightUi = (on: boolean) => {
    if (!lightBtn) return;
    lightBtn.setAttribute("aria-pressed", String(on));
    const label = lightBtn.querySelector("[data-light-label]");
    if (label) label.textContent = on ? "Apagar" : "Encender";
  };
  lightBtn?.addEventListener("click", () => {
    const on = lightBtn.getAttribute("aria-pressed") !== "true";
    lampWanted = on;
    lampTarget = on ? 1 : 0;
    setLightUi(on);
    wake();
  });

  replayBtn?.addEventListener("click", () => {
    if (phase === "unprinting" || phase === "heating") return;
    startUnprint();
    wake();
  });

  let statusText = "";
  const setStatus = (text: string) => {
    if (text === statusText || !statusEl) return;
    statusText = text;
    statusEl.textContent = text;
  };
  let shownLayer = -1;
  const setProgress = (printY: number) => {
    const p = clamp(printY / TOP, 0, 1);
    const layer = Math.round(p * LAYERS);
    if (layer !== shownLayer && layerEl) {
      shownLayer = layer;
      layerEl.textContent = `Capa ${layer} de ${LAYERS}`;
    }
    if (barEl) barEl.style.transform = `scaleX(${p.toFixed(4)})`;
  };

  // -------------------------------------------------------------------------
  // Print timeline

  let phase: Phase = "heating";
  let phaseT = 0;
  let nozzleAngle = 0;
  let autoLampDone = false;
  const nozzleLocal = new Vector3();
  const moveFrom = new Vector3();
  const moveTo = new Vector3();
  // Homes straight up out of frame (world space, so it doesn't turn with the
  // lamp), leaving a clean shot of the finished piece.
  const parkTo = new Vector3(0.35, TOP + 1.6, -0.2);

  const nozzleRadius = (y: number) => {
    if (y < BASE_H) return 0.6;
    const s = clamp((y - CY) / R, -1, 1);
    return R * Math.sqrt(1 - s * s) - RIB_T * 0.5;
  };

  /** Nozzle on the part's current perimeter, converted to world space. */
  const nozzleWorld = (y: number, out: Vector3) => {
    const r = nozzleRadius(y);
    nozzleLocal.set(r * Math.cos(nozzleAngle), y, r * Math.sin(nozzleAngle));
    return model.localToWorld(out.copy(nozzleLocal));
  };

  const startPrint = () => {
    phase = "heating";
    phaseT = 0;
    autoLampDone = false;
    printUniforms.uPrintY.value = 0;
    fixture.visible = false;
    resetFilament(current);
    setProgress(0);
    setStatus("Calentando la boquilla");
  };

  const startUnprint = () => {
    phase = "unprinting";
    phaseT = 0;
    lampTarget = 0;
    moveFrom.copy(hotend.position);
    setStatus("Preparando otra impresión");
  };

  const finishInstantly = () => {
    phase = "done";
    phaseT = 1;
    autoLampDone = true;
    printUniforms.uPrintY.value = TOP + 0.1;
    printUniforms.uPrinting.value = 0;
    fixture.visible = true;
    hotend.position.copy(parkTo);
    lampTarget = lampWanted ? 1 : 0;
    shared.uLamp.value = lampTarget;
    setLightUi(lampWanted);
    setStatus("Impresión lista");
    setProgress(TOP);
  };

  const updatePrint = (dt: number) => {
    phaseT += dt;
    const u = printUniforms;
    if (phase === "heating") {
      const t = clamp(phaseT / HEAT_SECONDS, 0, 1);
      u.uPrinting.value = t;
      nozzleWorld(0.012, moveTo);
      hotend.position.copy(moveTo);
      hotend.position.y += (1 - easeOut(t)) * 0.45;
      if (t >= 1) {
        phase = "printing";
        phaseT = 0;
        setStatus("Imprimiendo tu lámpara");
      }
    } else if (phase === "printing") {
      const t = clamp(phaseT / PRINT_SECONDS, 0, 1);
      const y = TOP * t;
      u.uPrintY.value = y;
      nozzleAngle += dt * 7.5;
      nozzleWorld(y + 0.012, hotend.position);
      setProgress(y);
      if (t >= 1) {
        phase = "parking";
        phaseT = 0;
        moveFrom.copy(hotend.position);
        setStatus("Impresión lista");
      }
    } else if (phase === "parking") {
      const t = clamp(phaseT / PARK_SECONDS, 0, 1);
      hotend.position.lerpVectors(moveFrom, parkTo, easeInOut(t));
      u.uPrinting.value = 1 - t;
      if (t >= 1) {
        phase = "done";
        phaseT = 0;
        u.uPrintY.value = TOP + 0.1;
        fixture.visible = true;
      }
    } else if (phase === "done") {
      if (!autoLampDone && phaseT > 0.35) {
        autoLampDone = true;
        if (lampWanted) {
          lampTarget = 1;
          setLightUi(true);
        }
      }
    } else if (phase === "unprinting") {
      const t = clamp(phaseT / UNPRINT_SECONDS, 0, 1);
      u.uPrintY.value = (TOP + 0.1) * (1 - t * t);
      if (t > 0.05) fixture.visible = false;
      nozzleWorld(0.45, moveTo);
      hotend.position.lerpVectors(moveFrom, moveTo, easeInOut(t));
      setProgress(u.uPrintY.value);
      if (t >= 1) startPrint();
    }
  };

  // -------------------------------------------------------------------------
  // Interaction: drag to turn (momentum), drag vertically to tilt.

  const EL_MIN = 0.02;
  const EL_MAX = 0.5;
  let rotY = 0.55;
  let velY = 0;
  let elev = 0.17;
  let dragging = false;
  let pointerId = -1;
  let lastX = 0;
  let lastY = 0;
  let lastInteraction = -1e9;
  let history: { x: number; t: number }[] = [];
  let hinted = false;

  const rubber = (v: number, min: number, max: number) => {
    if (v < min) return min - (min - v) * 0.35;
    if (v > max) return max + (v - max) * 0.35;
    return v;
  };

  canvas.style.touchAction = "pan-y";
  canvas.addEventListener("pointerdown", (e) => {
    if (dragging) return;
    dragging = true;
    pointerId = e.pointerId;
    canvas.setPointerCapture(e.pointerId);
    lastX = e.clientX;
    lastY = e.clientY;
    velY = 0;
    history = [{ x: e.clientX, t: e.timeStamp }];
    root.classList.add("is-dragging");
    if (!hinted) {
      hinted = true;
      hint?.classList.add("is-gone");
    }
    wake();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!dragging || e.pointerId !== pointerId) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    lastX = e.clientX;
    lastY = e.clientY;
    rotY += dx * 0.0085;
    elev = rubber(elev + dy * 0.0035, EL_MIN, EL_MAX);
    history.push({ x: e.clientX, t: e.timeStamp });
    if (history.length > 6) history.shift();
    lastInteraction = performance.now();
  });
  const release = (e: PointerEvent) => {
    if (!dragging || e.pointerId !== pointerId) return;
    dragging = false;
    root.classList.remove("is-dragging");
    const first = history[0];
    const last = history[history.length - 1];
    const span = last.t - first.t;
    if (span > 0 && e.timeStamp - last.t < 80) velY = ((last.x - first.x) / span) * 1000 * 0.0085;
    velY = clamp(velY, -9, 9);
    lastInteraction = performance.now();
  };
  canvas.addEventListener("pointerup", release);
  canvas.addEventListener("pointercancel", release);

  stage.addEventListener("keydown", (e) => {
    if (e.target !== stage) return;
    if (e.key === "ArrowLeft") velY -= 1.8;
    else if (e.key === "ArrowRight") velY += 1.8;
    else if (e.key === "ArrowUp") elev = clamp(elev - 0.05, EL_MIN, EL_MAX);
    else if (e.key === "ArrowDown") elev = clamp(elev + 0.05, EL_MIN, EL_MAX);
    else return;
    e.preventDefault();
    lastInteraction = performance.now();
    wake();
  });

  // -------------------------------------------------------------------------
  // Frame loop

  let width = 0;
  let height = 0;
  let distance = 5.6;
  const resize = () => {
    const rect = host.getBoundingClientRect();
    width = Math.max(1, Math.round(rect.width));
    height = Math.max(1, Math.round(rect.height));
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    distance = Math.max(5.5, 4.3 / camera.aspect);
    camera.updateProjectionMatrix();
  };
  const ro = new ResizeObserver(() => {
    resize();
    render();
  });
  ro.observe(host);
  resize();

  const tmp = new Vector3();
  const colorEase = (dt: number) => 1 - Math.exp(-dt * 9);

  const update = (dt: number, now: number) => {
    // Turning: 1:1 while dragging, then momentum, then a slow idle spin.
    if (!dragging) {
      const idle = now - lastInteraction > 2200;
      const spin = reduce.matches ? 0 : 0.22;
      if (idle) velY += (spin - velY) * (1 - Math.exp(-dt * 0.9));
      else velY *= Math.exp(-dt * 2.6);
      rotY += velY * dt;
      const settled = clamp(elev, EL_MIN, EL_MAX);
      elev += (settled - elev) * (1 - Math.exp(-dt * 12));
    }
    model.rotation.y = rotY;
    model.updateMatrixWorld();
    shared.uInvRot.value.setFromMatrix4(model.matrixWorld).invert();
    model.localToWorld(shared.uLampPos.value.set(0, CY, 0));

    camera.position.set(0, target.y + distance * Math.sin(elev), distance * Math.cos(elev));
    camera.lookAt(target);

    if (reduce.matches && phase !== "done") finishInstantly();
    updatePrint(dt);

    // Lamp fades in like an LED driver, out a little faster.
    const k = lampTarget > shared.uLamp.value ? 2.2 : 5;
    shared.uLamp.value += (lampTarget - shared.uLamp.value) * (1 - Math.exp(-dt * k));
    bulbMat.uniforms.uEmit.value = shared.uLamp.value * 3.2;

    const ce = colorEase(dt);
    for (let i = 0; i < filamentState.count; i++) filamentState.colors[i].lerp(filamentState.targets[i], ce);

    lampGlow.position.copy(shared.uLampPos.value);
    lampGlow.quaternion.copy(camera.quaternion);
    (lampGlow.material as ShaderMaterial).uniforms.uAmount.value = shared.uLamp.value;

    hotend.getWorldPosition(tmp);
    tipGlow.position.copy(tmp);
    tipGlow.quaternion.copy(camera.quaternion);
    (tipGlow.material as ShaderMaterial).uniforms.uAmount.value = printUniforms.uPrinting.value * 0.9;
  };

  const render = () => renderer.render(scene, camera);

  let raf = 0;
  let last = performance.now();
  let visible = true;
  let pageVisible = !document.hidden;
  let readyShown = false;

  const loop = (now: number) => {
    raf = 0;
    if (!visible || !pageVisible) return;
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    update(dt, now);
    render();
    if (!readyShown) {
      readyShown = true;
      root.classList.add("is-ready");
      ui.classList.add("is-ready");
    }
    raf = requestAnimationFrame(loop);
  };
  function wake() {
    if (raf || !visible || !pageVisible) return;
    last = performance.now();
    raf = requestAnimationFrame(loop);
  }

  const io = new IntersectionObserver(
    ([entry]) => {
      visible = entry.isIntersecting;
      if (visible) wake();
    },
    { rootMargin: "80px" },
  );
  io.observe(root);
  const onVisibility = () => {
    pageVisible = !document.hidden;
    if (pageVisible) wake();
  };
  document.addEventListener("visibilitychange", onVisibility);

  canvas.addEventListener("webglcontextlost", (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf);
    raf = 0;
    root.classList.add("is-failed");
  });

  if (filamentEl) filamentEl.textContent = current.name;
  setLightUi(false);
  if (reduce.matches) finishInstantly();
  else startPrint();
  wake();

  return {
    destroy() {
      cancelAnimationFrame(raf);
      io.disconnect();
      ro.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      renderer.dispose();
      canvas.remove();
    },
  };
}
