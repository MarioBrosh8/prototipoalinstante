// Behaviour for Hero.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
const root = document.querySelector<HTMLElement>("[data-printer]");
if (root) {
  root.classList.add("is-loading");

  const fail = () => {
    root.classList.remove("is-loading");
    root.classList.add("is-failed");
    const src = root.dataset.poster;
    if (src && !root.querySelector("img")) {
      const img = new Image();
      img.className = "chamber__poster";
      img.alt = "Lámpara esférica de celosía impresa por PROIN, encendida";
      img.src = src;
      img.decoding = "async";
      root.prepend(img);
    }
  };

  const supportsWebGL = () => {
    try {
      const c = document.createElement("canvas");
      return !!c.getContext("webgl2");
    } catch {
      return false;
    }
  };

  const start = () => {
    if (!supportsWebGL()) return fail();
    import("./printer3d")
      .then(({ mount }) => {
        mount(root);
        root.classList.remove("is-loading");
      })
      .catch(fail);
  };

  // Let the page paint and settle first; the chamber shows its loader meanwhile.
  const idle = (cb: () => void) =>
    "requestIdleCallback" in window ? requestIdleCallback(cb, { timeout: 900 }) : setTimeout(cb, 250);
  if (document.readyState === "complete") idle(start);
  else addEventListener("load", () => idle(start), { once: true });
}

export {};
