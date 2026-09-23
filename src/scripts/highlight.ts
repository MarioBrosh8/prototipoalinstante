/*
  Active-state highlight for tab lists and segmented controls.

  The container holds the real controls plus an aria-hidden copy of their
  labels styled as "active". The copy is clipped to the active control's box,
  and moving the clip animates text colour and background as one piece, which
  separate colour transitions never quite manage.
*/

export function clipHighlight(container: HTMLElement, overlay: HTMLElement) {
  let current: HTMLElement | null = null;

  const place = (el: HTMLElement, instant = false) => {
    current = el;
    const left = el.offsetLeft;
    const right = container.scrollWidth - (left + el.offsetWidth);
    const top = el.offsetTop;
    const bottom = container.scrollHeight - (top + el.offsetHeight);
    if (instant) overlay.style.transition = "none";
    overlay.style.clipPath = `inset(${top}px ${right}px ${bottom}px ${left}px round 999px)`;
    if (instant) {
      void overlay.offsetWidth;
      overlay.style.transition = "";
    }
  };

  new ResizeObserver(() => current && place(current, true)).observe(container);
  return place;
}
