// Behaviour for Faq.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { clipHighlight } from "./highlight";

const root = document.querySelector<HTMLElement>("[data-tabs]");
if (root) {
  const list = root.querySelector<HTMLElement>("[data-tablist]")!;
  const overlay = root.querySelector<HTMLElement>("[data-tabs-active]")!;
  const tabs = Array.from(list.querySelectorAll<HTMLButtonElement>("[data-tab]"));
  const panels = new Map(
    Array.from(root.querySelectorAll<HTMLElement>("[data-panel]")).map((p) => [p.dataset.panel!, p]),
  );
  const place = clipHighlight(list, overlay);

  const select = (tab: HTMLButtonElement, focus = false) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute("aria-selected", String(on));
      t.tabIndex = on ? 0 : -1;
    });
    panels.forEach((p, id) => {
      const on = id === tab.dataset.tab;
      if (on && p.hidden) {
        p.hidden = false;
        p.classList.remove("is-entering");
        void p.offsetWidth;
        p.classList.add("is-entering");
        p.querySelector("img")?.setAttribute("loading", "eager");
      } else if (!on) {
        p.hidden = true;
        p.classList.remove("is-entering");
      }
    });
    place(tab);
    tab.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
    if (focus) tab.focus();
  };

  tabs.forEach((tab, i) => {
    tab.addEventListener("click", () => select(tab));
    tab.addEventListener("keydown", (e) => {
      let next = -1;
      if (e.key === "ArrowRight") next = (i + 1) % tabs.length;
      else if (e.key === "ArrowLeft") next = (i - 1 + tabs.length) % tabs.length;
      else if (e.key === "Home") next = 0;
      else if (e.key === "End") next = tabs.length - 1;
      if (next < 0) return;
      e.preventDefault();
      select(tabs[next], true);
    });
  });

  place(tabs[0], true);
  // Warm up the other photos once the section is close, so switching tabs
  // never shows an empty frame.
  new IntersectionObserver(
    ([e], io) => {
      if (!e.isIntersecting) return;
      root.querySelectorAll("img[loading='lazy']").forEach((img) => img.setAttribute("loading", "eager"));
      io.disconnect();
    },
    { rootMargin: "300px" },
  ).observe(root);
}
