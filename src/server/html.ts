/** Tiny shared HTML helpers for server-side rendering (top bar + dashboard). */

/** Escape text for interpolation into element content. */
export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Escape text for interpolation into a double-quoted attribute value. */
export function attr(s: string): string {
  return esc(s).replace(/"/g, "&quot;");
}

/**
 * The honest, approximate journey label — the one place its format lives, so the
 * top bar and the dashboard can't drift apart. `position` is which lesson to
 * name (the card names lessons completed; a lesson page names the current one).
 */
export function journeyLabel(position: number, plannedTotal: number): string {
  return plannedTotal > 0 ? `Lesson ${position} of ~${plannedTotal}` : "";
}
