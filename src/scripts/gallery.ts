// Behaviour for Gallery.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { finePointer, reduceMotion } from "./motion";

const strip = document.querySelector<HTMLElement>("[data-strip]");
const track = document.querySelector<HTMLElement>("[data-strip-track]");
const prev = document.querySelector<HTMLButtonElement>("[data-strip-prev]");
const next = document.querySelector<HTMLButtonElement>("[data-strip-next]");

if (strip && track) {
  const cards = Array.from(track.children) as HTMLElement[];

  // Buttons page by one card; their disabled state comes from whether the
  // first/last card is fully in view (no scroll listener).
  const edge = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        const full = e.intersectionRatio > 0.96;
        if (e.target === cards[0] && prev) prev.disabled = full;
        if (e.target === cards[cards.length - 1] && next) next.disabled = full;
      }
    },
    { root: strip, threshold: [0, 0.96, 1] },
  );
  edge.observe(cards[0]);
  edge.observe(cards[cards.length - 1]);

  const page = (dir: 1 | -1) => {
    const step = (cards[1]?.offsetLeft ?? 0) - (cards[0]?.offsetLeft ?? 0) || 320;
    strip.scrollBy({ left: dir * step, behavior: reduceMotion.matches ? "auto" : "smooth" });
  };
  prev?.addEventListener("click", () => page(-1));
  next?.addEventListener("click", () => page(1));

  // Mouse: drag to scroll, with momentum and rubber-banded edges. Touch keeps
  // the browser's own scrolling, which already has both.
  let dragging = false;
  let moved = 0;
  let startX = 0;
  let startScroll = 0;
  let samples: { x: number; t: number }[] = [];
  let overshoot = 0;
  let raf = 0;

  const max = () => strip.scrollWidth - strip.clientWidth;
  const rubber = (d: number) => (d * 0.55 * 420) / (420 + 0.55 * Math.abs(d));
  const setOvershoot = (px: number) => {
    overshoot = px;
    track.style.transform = px ? `translateX(${px.toFixed(1)}px)` : "";
  };

  // Release speed over the last 100 ms of movement, in px per ms. Holding
  // still for more than 80 ms before letting go means no fling.
  const releaseSpeed = (t: number) => {
    const last = samples[samples.length - 1];
    if (!last || t - last.t > 80) return 0;
    const first = samples.find((s) => last.t - s.t <= 100) ?? last;
    return last.t > first.t ? (last.x - first.x) / (last.t - first.t) : 0;
  };

  strip.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !finePointer.matches) return;
    cancelAnimationFrame(raf);
    dragging = true;
    moved = 0;
    startX = e.clientX;
    startScroll = strip.scrollLeft;
    samples = [{ x: e.clientX, t: e.timeStamp }];
    strip.setPointerCapture(e.pointerId);
  });

  strip.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) strip.classList.add("is-dragging");
    const want = startScroll - dx;
    const clamped = Math.min(max(), Math.max(0, want));
    strip.scrollLeft = clamped;
    setOvershoot(want === clamped ? 0 : rubber(clamped - want));
    samples.push({ x: e.clientX, t: e.timeStamp });
    if (samples.length > 12) samples.shift();
  });

  const release = (e: PointerEvent) => {
    if (!dragging) return;
    dragging = false;
    let v = -releaseSpeed(e.timeStamp) * 16.67; // px per 60 Hz frame
    let ov = 0; // overshoot velocity
    let pos = strip.scrollLeft;
    let last = performance.now();
    const glide = (now: number) => {
      const frames = Math.min((now - last) / 16.67, 3);
      last = now;
      // Whole-frame steps keep the spring stable on a slow frame.
      for (let left = frames; left > 0; left -= 1) {
        const dt = Math.min(1, left);
        if (v) {
          const want = pos + v * dt;
          pos = Math.min(max(), Math.max(0, want));
          strip.scrollLeft = pos;
          if (want !== pos) {
            // Hit an end: what is left of the fling becomes a small bounce.
            ov = -v * 0.6;
            v = 0;
          } else {
            v *= Math.pow(0.94, dt);
            if (Math.abs(v) < 0.3) v = 0;
          }
        }
        if (overshoot || ov) {
          // Critically damped spring back to the edge (no wobble).
          ov += (-overshoot * 0.06 - ov * 0.5) * dt;
          const nextOvershoot = overshoot + ov * dt;
          if (Math.abs(nextOvershoot) < 0.4 && Math.abs(ov) < 0.4) {
            ov = 0;
            setOvershoot(0);
          } else setOvershoot(Math.max(-64, Math.min(64, nextOvershoot)));
        }
      }
      if (v || overshoot) raf = requestAnimationFrame(glide);
      else strip.classList.remove("is-dragging");
    };
    raf = requestAnimationFrame(glide);
  };
  strip.addEventListener("pointerup", release);
  strip.addEventListener("pointercancel", release);

  // A drag is not a click on the card underneath.
  strip.addEventListener(
    "click",
    (e) => {
      if (moved > 6) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    true,
  );
}
