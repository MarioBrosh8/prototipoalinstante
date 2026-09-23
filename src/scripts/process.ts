// Behaviour for Process.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { reduceMotion, scrollProgress } from "./motion";

const body = document.querySelector<HTMLElement>("[data-process]");
if (body && !reduceMotion.matches) {
  const svg = body.querySelector<SVGSVGElement>("svg")!;
  const ghost = body.querySelector<SVGPathElement>("[data-ghost]")!;
  const line = body.querySelector<SVGPathElement>("[data-line]")!;
  const nozzle = body.querySelector<HTMLElement>("[data-nozzle]")!;
  const steps = Array.from(body.querySelectorAll<HTMLElement>("[data-step]"));
  const nodes = steps.map((s) => s.querySelector<HTMLElement>("[data-node]")!);

  let total = 1;
  let nodeLen: number[] = [];
  let progress = 0;

  // Layout offsets, not client rects: the steps may still be mid-reveal
  // (translated), and the path must match where they will settle.
  const offsetWithin = (el: HTMLElement) => {
    let x = 0;
    let y = 0;
    let n: HTMLElement | null = el;
    while (n && n !== body) {
      x += n.offsetLeft;
      y += n.offsetTop;
      n = n.offsetParent as HTMLElement | null;
    }
    return { x, y };
  };

  const build = () => {
    const w = body.offsetWidth;
    const h = body.offsetHeight;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const pts = nodes.map((n) => {
      const o = offsetWithin(n);
      return { x: o.x + n.offsetWidth / 2, y: o.y + n.offsetHeight / 2 };
    });
    const horizontal = pts.length > 1 && Math.abs(pts[1].y - pts[0].y) < 4;
    const last = pts[pts.length - 1];
    // Starts at the first station; runs off past the last one.
    const all = horizontal ? [...pts, { x: Math.max(w, last.x + 40), y: last.y }] : [...pts, { x: last.x, y: h }];

    // A gentle wave between stations, like a bead of filament.
    const segment = (i: number) => {
      const a = all[i];
      const b = all[i + 1];
      const amp = (i % 2 ? 1 : -1) * (horizontal ? 22 : 16);
      if (horizontal) {
        const dx = (b.x - a.x) / 3;
        return ` C ${a.x + dx} ${a.y + amp}, ${b.x - dx} ${b.y - amp}, ${b.x} ${b.y}`;
      }
      const dy = (b.y - a.y) / 3;
      return ` C ${a.x + amp} ${a.y + dy}, ${b.x - amp} ${b.y - dy}, ${b.x} ${b.y}`;
    };

    let d = `M ${all[0].x} ${all[0].y}`;
    nodeLen = [0];
    for (let i = 0; i < all.length - 1; i++) {
      d += segment(i);
      if (i + 1 < pts.length) {
        ghost.setAttribute("d", d);
        nodeLen.push(ghost.getTotalLength());
      }
    }
    ghost.setAttribute("d", d);
    line.setAttribute("d", d);
    total = ghost.getTotalLength();
    line.style.strokeDasharray = `${total}`;
    render(progress);
  };

  const render = (p: number) => {
    progress = p;
    const len = total * p;
    line.style.strokeDashoffset = `${total - len}`;
    const pt = line.getPointAtLength(Math.max(0.01, len));
    nozzle.style.transform = `translate(${pt.x - 17}px, ${pt.y - 36}px)`;
    steps.forEach((s, i) => s.classList.toggle("is-lit", len >= nodeLen[i] - 2));
  };

  body.classList.add("is-live");
  new ResizeObserver(build).observe(body);
  build();
  scrollProgress(body, render, { start: 0.78, end: 0.5 });
}
