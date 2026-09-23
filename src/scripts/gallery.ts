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
  let lastX = 0;
  let lastT = 0;
  let velocity = 0;
  let overshoot = 0;
  let raf = 0;

  const max = () => strip.scrollWidth - strip.clientWidth;
  const rubber = (d: number) => (d * 0.55 * 420) / (420 + 0.55 * Math.abs(d));
  const setOvershoot = (px: number) => {
    overshoot = px;
    track.style.transform = px ? `translateX(${px.toFixed(1)}px)` : "";
  };

  strip.addEventListener("pointerdown", (e) => {
    if (e.pointerType !== "mouse" || e.button !== 0 || !finePointer.matches) return;
    cancelAnimationFrame(raf);
    dragging = true;
    moved = 0;
    startX = lastX = e.clientX;
    startScroll = strip.scrollLeft;
    lastT = e.timeStamp;
    velocity = 0;
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
    const dt = e.timeStamp - lastT;
    if (dt > 0) velocity = (e.clientX - lastX) / dt;
    lastX = e.clientX;
    lastT = e.timeStamp;
  });

  const release = () => {
    if (!dragging) return;
    dragging = false;
    let v = -velocity * 16; // px per frame
    let last = performance.now();
    const glide = (now: number) => {
      const dt = Math.min((now - last) / 16.67, 3);
      last = now;
      if (overshoot) {
        // Spring back from past the edge.
        setOvershoot(Math.abs(overshoot) < 0.5 ? 0 : overshoot * Math.pow(0.8, dt));
      }
      if (Math.abs(v) > 0.3) {
        strip.scrollLeft += v * dt;
        v *= Math.pow(0.94, dt);
      } else v = 0;
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
