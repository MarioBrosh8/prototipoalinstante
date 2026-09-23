// Shared motion helpers. No scroll listeners: IntersectionObserver decides
// what is on screen, and requestAnimationFrame only runs while it is.

export const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
export const finePointer = matchMedia("(hover: hover) and (pointer: fine)");

/**
 * Elements marked [data-reveal] or [data-print] that start below the fold are
 * hidden (.pre) and revealed once (.is-in) as they scroll in. Anything already
 * on screen is left alone, so nothing flashes and no-JS visitors see it all.
 */
export function initReveals(scope: ParentNode = document) {
  const els = scope.querySelectorAll<HTMLElement>("[data-reveal], [data-print]");
  if (!els.length) return;
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -6% 0px", threshold: 0.1 },
  );
  const fold = innerHeight * 0.94;
  els.forEach((el) => {
    if (el.getBoundingClientRect().top < fold) return;
    el.classList.add("pre");
    io.observe(el);
  });
}

/**
 * Calls `cb` with 0..1 as `el` travels through the viewport: 0 when its top
 * reaches `start` (fraction of the viewport height), 1 when its bottom
 * reaches `end`. The rAF loop only runs while the element intersects.
 */
export function scrollProgress(
  el: Element,
  cb: (p: number) => void,
  { start = 0.85, end = 0.45 }: { start?: number; end?: number } = {},
) {
  let raf = 0;
  let active = false;
  let last = -1;
  const measure = () => {
    const r = el.getBoundingClientRect();
    const vh = innerHeight;
    const span = r.height + vh * (start - end);
    const p = Math.min(1, Math.max(0, (vh * start - r.top) / span));
    if (Math.abs(p - last) > 0.0004) {
      last = p;
      cb(p);
    }
  };
  const tick = () => {
    measure();
    raf = active ? requestAnimationFrame(tick) : 0;
  };
  const io = new IntersectionObserver(([entry]) => {
    active = entry.isIntersecting;
    if (active && !raf) raf = requestAnimationFrame(tick);
    if (!active) measure();
  });
  io.observe(el);
  measure();
  return () => {
    io.disconnect();
    cancelAnimationFrame(raf);
  };
}

/**
 * A critically damped spring toward a moving target, for decorative pointer
 * following. Writes through `apply` only while it is moving.
 */
export function springFollow(apply: (x: number, y: number) => void, { stiffness = 170, damping = 26 } = {}) {
  let x = 0;
  let y = 0;
  let vx = 0;
  let vy = 0;
  let tx = 0;
  let ty = 0;
  let raf = 0;
  let last = 0;
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30);
    last = now;
    vx += ((tx - x) * stiffness - vx * damping) * dt;
    vy += ((ty - y) * stiffness - vy * damping) * dt;
    x += vx * dt;
    y += vy * dt;
    const settled = Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05 && Math.abs(vx) < 0.05 && Math.abs(vy) < 0.05;
    if (settled) {
      x = tx;
      y = ty;
      vx = vy = 0;
    }
    apply(x, y);
    raf = settled ? 0 : requestAnimationFrame(step);
  };
  return (nx: number, ny: number) => {
    tx = nx;
    ty = ny;
    if (!raf) {
      last = performance.now();
      raf = requestAnimationFrame(step);
    }
  };
}

/** Primary CTAs lean toward the cursor a little (fine pointers only). */
export function initMagnetic() {
  if (!finePointer.matches || reduceMotion.matches) return;
  document.querySelectorAll<HTMLElement>("[data-magnetic]").forEach((el) => {
    // `translate` composes with the :active scale on `transform`.
    const follow = springFollow((x, y) => {
      el.style.translate = `${x.toFixed(2)}px ${y.toFixed(2)}px`;
    });
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      follow((e.clientX - (r.left + r.width / 2)) * 0.16, (e.clientY - (r.top + r.height / 2)) * 0.26);
    });
    el.addEventListener("pointerleave", () => follow(0, 0));
  });
}
