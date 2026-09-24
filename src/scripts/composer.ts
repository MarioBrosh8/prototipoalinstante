// Behaviour for Composer.astro (bundled through main.ts, never inlined: the CSP only allows same-origin scripts).
import { clipHighlight } from "./highlight";

const form = document.querySelector<HTMLFormElement>("[data-composer]");
const preview = document.querySelector<HTMLElement>("[data-preview]");
const steps = document.querySelector<HTMLElement>("[data-steps]");
const copyBtn = document.querySelector<HTMLButtonElement>("[data-copy]");
const open = document.querySelector<HTMLAnchorElement>("[data-open]");
const note = document.querySelector<HTMLElement>("[data-note]");

if (form && preview && steps && copyBtn && open && note) {
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

  const setNote = (text: string, tone: "" | "ok" | "warn" = "") => {
    note.textContent = text;
    note.dataset.tone = tone;
  };

  // Instagram can't prefill a DM (ig.me only takes ?ref=), so sending is two
  // steps: copy the message here, then open the chat and paste it there.
  let copiedText = "";

  const render = () => {
    const text = message();
    preview.textContent = text;
    // Editing after copying leaves a stale clipboard: back to step 1.
    if (steps.dataset.state === "copied" && text !== copiedText) {
      steps.dataset.state = "compose";
      setNote(defaultNote);
    }
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

  // execCommand is deprecated, but in-app browsers (Instagram's own webview
  // among them) can reject the Clipboard API. Still inside the click's
  // user activation, so it is allowed to copy.
  const legacyCopy = (text: string) => {
    const focused = document.activeElement as HTMLElement | null;
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;font-size:16px;pointer-events:none";
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {
      ok = false;
    }
    ta.remove();
    focused?.focus({ preventScroll: true });
    return ok;
  };

  // writeText starts synchronously inside the click, so Safari keeps the gesture.
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (!legacyCopy(text)) throw new Error("copy failed");
    }
  };

  const touch = () => matchMedia("(pointer: coarse)").matches;
  const mod = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";

  const copied = (text: string) => {
    copiedText = text;
    steps.dataset.state = "copied";
    setNote(
      touch()
        ? "Listo. En el chat, mantén presionado el cuadro de texto y toca Pegar."
        : `Listo. En el chat, pégalo con ${mod} + V y envíalo.`,
      "ok",
    );
    preview.classList.remove("is-copied");
    void preview.offsetWidth;
    preview.classList.add("is-copied");
  };

  const failed = () => {
    // Leave the bubble selected so copying by hand is one gesture away.
    getSelection()?.selectAllChildren(preview);
    setNote(
      touch()
        ? "No se pudo copiar. Mantén presionado el mensaje de arriba, cópialo y luego abre el chat."
        : `No se pudo copiar. Ya quedó seleccionado: cópialo con ${mod} + C y luego abre el chat.`,
      "warn",
    );
  };

  const ready = () => {
    if (que.value.trim()) return true;
    setError(true);
    que.focus();
    return false;
  };

  copyBtn.addEventListener("click", () => {
    if (!ready()) return;
    const text = message();
    copy(text).then(() => copied(text), failed);
  });

  open.addEventListener("click", (e) => {
    if (!ready()) {
      e.preventDefault();
      return;
    }
    // Skipped step 1: copy on the way out. The link opens Instagram either way.
    if (steps.dataset.state !== "copied") {
      const text = message();
      copy(text).then(() => copied(text), failed);
    }
  });

  render();
}
