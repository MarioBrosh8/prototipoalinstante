// Behaviour for Nav.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
const nav = document.querySelector<HTMLElement>("[data-nav]")!;
const sentinel = document.querySelector("[data-nav-sentinel]");
if (sentinel) {
  new IntersectionObserver(([e]) => nav.classList.toggle("is-scrolled", !e.isIntersecting)).observe(sentinel);
}

// Active section: the link for whichever section owns the middle of the screen.
const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("[data-nav-link]"));
const ind = nav.querySelector<HTMLElement>("[data-nav-ind]");
const moveInd = (link?: HTMLAnchorElement) => {
  if (!ind) return;
  if (!link) {
    ind.style.setProperty("--o", "0");
    return;
  }
  const pad = 14;
  ind.style.setProperty("--x", `${link.offsetLeft + pad}px`);
  ind.style.setProperty("--w", String((link.offsetWidth - pad * 2) / 100));
  ind.style.setProperty("--o", "1");
};
const sections = links
  .map((l) => document.querySelector<HTMLElement>(l.getAttribute("href")!))
  .filter((s): s is HTMLElement => !!s);
const setActive = (id: string | null) => {
  let active: HTMLAnchorElement | undefined;
  links.forEach((l) => {
    const on = l.getAttribute("href") === `#${id}`;
    if (on) {
      l.setAttribute("aria-current", "true");
      active = l;
    } else l.removeAttribute("aria-current");
  });
  moveInd(active);
};
const visible = new Map<string, boolean>();
const sio = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => visible.set(e.target.id, e.isIntersecting));
    const current = sections.find((s) => visible.get(s.id));
    setActive(current ? current.id : null);
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
sections.forEach((s) => sio.observe(s));

// Mobile menu.
const toggle = nav.querySelector<HTMLButtonElement>("[data-menu-toggle]")!;
const label = toggle.querySelector("[data-menu-label]")!;
const menu = document.querySelector<HTMLElement>("[data-menu]")!;
const blockers = () => Array.from(document.querySelectorAll<HTMLElement>("main, footer"));
let closeTimer = 0;

const open = () => {
  clearTimeout(closeTimer);
  menu.hidden = false;
  toggle.setAttribute("aria-expanded", "true");
  label.textContent = "Cerrar menú";
  document.documentElement.style.overflow = "hidden";
  blockers().forEach((el) => (el.inert = true));
  requestAnimationFrame(() => {
    menu.classList.add("is-open");
    menu.querySelector<HTMLElement>("[data-menu-link]")?.focus({ preventScroll: true });
  });
};
const close = (restoreFocus = true) => {
  menu.classList.remove("is-open");
  toggle.setAttribute("aria-expanded", "false");
  label.textContent = "Abrir menú";
  document.documentElement.style.overflow = "";
  blockers().forEach((el) => (el.inert = false));
  closeTimer = window.setTimeout(() => (menu.hidden = true), 300);
  if (restoreFocus) toggle.focus({ preventScroll: true });
};

toggle.addEventListener("click", () => (toggle.getAttribute("aria-expanded") === "true" ? close() : open()));
menu.addEventListener("click", (e) => {
  if ((e.target as HTMLElement).closest("a")) close(false);
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") close();
});
matchMedia("(min-width: 900px)").addEventListener("change", (e) => {
  if (e.matches && toggle.getAttribute("aria-expanded") === "true") close(false);
});

export {};
