// Behaviour for FinalCta.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { reduceMotion, scrollProgress } from "./motion";

const band = document.querySelector<HTMLElement>("[data-final]");
const infill = band?.querySelector<HTMLElement>("[data-final-infill]");
const solid = band?.querySelector<HTMLElement>("[data-final-solid]");
if (band && infill && solid && !reduceMotion.matches) {
  const smooth = (a: number, b: number, x: number) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
  };
  scrollProgress(
    band,
    (p) => {
      // Each value goes on the one layer that reads it, so a scroll frame
      // restyles two elements, not the whole band.
      infill.style.setProperty("--hatch", smooth(0.12, 0.42, p).toFixed(3));
      // Solid top layers land in discrete steps, like layers.
      const top = Math.min(1, Math.max(0, (p - 0.4) / 0.42));
      solid.style.setProperty("--solid", (Math.floor(top * 18) / 18).toFixed(3));
    },
    { start: 1, end: 1 },
  );
}
