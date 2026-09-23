// The page's only client entry. Every section's behaviour is bundled into this
// one same-origin module: the CSP forbids inline scripts, and the zone's rate
// limit rewards fewer requests. three.js stays a separate lazy chunk (hero.ts).
import "./nav";
import "./hero";
import "./categories";
import "./process";
import "./gallery";
import "./faq";
import "./final-cta";
import "./composer";
import { initMagnetic, initReveals } from "./motion";

initReveals();
initMagnetic();

// Dev only (stripped from builds): ?shot=<section id> reveals everything and
// renders that section at the top, for headless screenshots during QA.
if (import.meta.env.DEV) {
  const shot = new URLSearchParams(location.search).get("shot");
  const target = shot ? document.getElementById(shot) : null;
  if (target) {
    document.querySelectorAll(".pre").forEach((el) => el.classList.add("is-in"));
    let prev = target.previousElementSibling;
    while (prev) {
      (prev as HTMLElement).style.display = "none";
      prev = prev.previousElementSibling;
    }
    target.style.marginTop = "84px";
  }
}
