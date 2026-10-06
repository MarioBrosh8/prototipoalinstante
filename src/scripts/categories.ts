// Behaviour for Categories.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { reduceMotion } from "./motion";

const root = document.querySelector<HTMLElement>("[data-cats]");
if (root) {
  const buttons = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-cat]"));
  const images = new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-cat-img]")).map((el) => [el.dataset.catImg!, el]),
  );
  const caption = root.querySelector<HTMLElement>("[data-cat-caption]");
  const captions = new Map(buttons.map((b, i) => [b.dataset.cat!, i]));
  const pieces = JSON.parse(root.dataset.pieces ?? "[]") as string[];
  let active = buttons[0]?.dataset.cat ?? "";
  let timer = 0;

  // FLIP: measure where each item is on screen, apply the change (the layout
  // jumps instantly), then slide every item from its old spot to its new one
  // on transform only. Measuring the on-screen spot lets a new hover pick up
  // mid-slide.
  const slide = (change: () => void) => {
    if (reduceMotion.matches) return change();
    const before = buttons.map((b) => b.getBoundingClientRect().top);
    buttons.forEach((b) => {
      b.style.transition = "none";
      b.style.transform = "none";
    });
    change();
    const moved = buttons.filter((b, i) => {
      const dy = before[i] - b.getBoundingClientRect().top;
      b.style.transform = Math.abs(dy) < 0.5 ? "" : `translateY(${dy}px)`;
      return !!b.style.transform;
    });
    void root.offsetWidth;
    buttons.forEach((b) => (b.style.transition = ""));
    moved.forEach((b) => {
      b.style.transition = "transform 420ms var(--ease-drawer)";
      b.style.transform = "";
    });
  };
  buttons.forEach((b) =>
    b.addEventListener("transitionend", (e) => {
      if (e.propertyName === "transform" && e.target === b) b.style.transition = "";
    }),
  );

  const show = (id: string) => {
    if (id === active) return;
    const prev = images.get(active);
    const next = images.get(id);
    slide(() => buttons.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === id))));
    images.forEach((el) => el.classList.remove("was-active"));
    prev?.classList.remove("is-active", "is-printing");
    prev?.classList.add("was-active");
    if (next) {
      next.classList.remove("is-printing");
      void next.offsetWidth; // restart the print animation
      next.classList.add("is-active", "is-printing");
      // Make sure the full-size image is fetched now, not when lazy decides.
      next.querySelector("img")?.setAttribute("loading", "eager");
    }
    if (caption) caption.textContent = pieces[captions.get(id) ?? 0] ?? "";
    active = id;
    clearTimeout(timer);
    timer = window.setTimeout(() => prev?.classList.remove("was-active"), 800);
  };

  buttons.forEach((b) => {
    b.addEventListener("click", () => show(b.dataset.cat!));
    b.addEventListener("focus", () => show(b.dataset.cat!));
    b.addEventListener("pointerenter", (e) => {
      if (e.pointerType === "mouse") show(b.dataset.cat!);
    });
  });
}

export {};
