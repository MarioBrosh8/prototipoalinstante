// Behaviour for Composer.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { clipHighlight } from "./highlight";

const form = document.querySelector<HTMLFormElement>("[data-composer]");
const preview = document.querySelector<HTMLElement>("[data-preview]");
const send = document.querySelector<HTMLAnchorElement>("[data-send]");
const copyBtn = document.querySelector<HTMLButtonElement>("[data-copy]");
const note = document.querySelector<HTMLElement>("[data-note]");

if (form && preview && send && copyBtn && note) {
  const que = form.elements.namedItem("que") as HTMLInputElement;
  const medidas = form.elements.namedItem("medidas") as HTMLInputElement;
  const cantidad = form.elements.namedItem("cantidad") as HTMLInputElement;
  const error = form.querySelector<HTMLElement>("[data-error]")!;
  const defaultNote = note.textContent?.trim() ?? "";

  const count = () => Math.min(9999, Math.max(1, parseInt(cantidad.value.replace(/\D/g, ""), 10) || 1));

  const message = () => {
    const archivo = (form.elements.namedItem("archivo") as RadioNodeList).value;
    const n = count();
    const lines = ["Hola, PROIN. Me gustaría cotizar:"];
    lines.push(`• Qué: ${que.value.trim() || "(por definir)"}`);
    if (medidas.value.trim()) lines.push(`• Medidas aproximadas: ${medidas.value.trim()}`);
    lines.push(`• Cantidad: ${n} ${n === 1 ? "pieza" : "piezas"}`);
    if (archivo === "si") lines.push("• Ya tengo archivo STL");
    else if (archivo === "no") lines.push("• Necesito diseño desde cero");
    else lines.push("• Todavía no sé si necesito diseño");
    lines.push("¡Gracias!");
    return lines.join("\n");
  };

  const render = () => {
    preview.textContent = message();
  };

  const setError = (on: boolean) => {
    error.hidden = !on;
    que.setAttribute("aria-invalid", String(on));
  };

  form.addEventListener("input", (e) => {
    if (e.target === que && que.value.trim()) setError(false);
    render();
  });
  form.addEventListener("change", render);
  form.addEventListener("submit", (e) => e.preventDefault());

  cantidad.addEventListener("blur", () => {
    cantidad.value = String(count());
    render();
  });
  form.querySelectorAll<HTMLButtonElement>("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      cantidad.value = String(Math.min(9999, Math.max(1, count() + Number(b.dataset.step))));
      render();
    }),
  );

  // Segmented control highlight.
  const seg = form.querySelector<HTMLElement>("[data-seg]")!;
  const segActive = form.querySelector<HTMLElement>("[data-seg-active]")!;
  const placeSeg = clipHighlight(seg, segActive);
  const syncSeg = (instant = false) => {
    const checked = seg.querySelector<HTMLInputElement>("input:checked");
    const label = checked?.closest<HTMLElement>(".seg__opt");
    if (label) placeSeg(label, instant);
  };
  seg.addEventListener("change", () => syncSeg());
  syncSeg(true);

  // Copy: synchronous inside the click so Safari keeps the user gesture.
  // execCommand is deprecated but is the only way for browsers without the
  // async Clipboard API (or outside a secure context).
  const copy = (text: string) => {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    return new Promise<void>((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      if (ok) resolve();
      else reject(new Error("copy failed"));
    });
  };

  let noteTimer = 0;
  const setNote = (text: string, ok: boolean) => {
    note.textContent = text;
    note.classList.toggle("is-ok", ok);
    clearTimeout(noteTimer);
    noteTimer = window.setTimeout(() => {
      note.textContent = defaultNote;
      note.classList.remove("is-ok");
    }, 6000);
  };

  const copied = () => setNote("Mensaje copiado. Pégalo en el chat de Instagram.", true);
  const failed = () =>
    setNote("No pudimos copiarlo. Mantén presionado el mensaje de arriba para copiarlo tú.", false);

  send.addEventListener("click", (e) => {
    if (!que.value.trim()) {
      e.preventDefault();
      setError(true);
      que.focus();
      return;
    }
    // The link itself opens Instagram in a new tab.
    copy(message()).then(copied, failed);
  });

  let copyTimer = 0;
  copyBtn.addEventListener("click", () => {
    copy(message()).then(() => {
      copyBtn.classList.add("is-done");
      copied();
      clearTimeout(copyTimer);
      copyTimer = window.setTimeout(() => copyBtn.classList.remove("is-done"), 1800);
    }, failed);
  });

  render();
}
