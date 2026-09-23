// Behaviour for FinalCta.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { reduceMotion, scrollProgress } from "./motion";

const band = document.querySelector<HTMLElement>("[data-final]");
if (band && !reduceMotion.matches) {
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  scrollProgress(
    band,
    (p) => {
      band.style.setProperty("--hatch", smooth(0.12, 0.42, p).toFixed(3));
      // Solid top layers land in discrete steps, like layers.
      const solid = Math.min(1, Math.max(0, (p - 0.4) / 0.42));
      band.style.setProperty("--solid", (Math.floor(solid * 18) / 18).toFixed(3));
    },
    { start: 1, end: 1 },
  );
}
