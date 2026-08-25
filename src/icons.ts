// Inline SVG glyphs for the Header (heartSvg → Focus, infoSvg → About).
// Not text: the self-hosted Oswald is a Latin subset, so a text glyph (♡, ⓘ)
// would fall through to a system font and sit at the wrong weight beside the
// rest of the chrome. Shape only: the size is the stylesheet's to set
// (`.app-actions svg`, `.act-heart svg`), so no width or height attribute.

const HEART_PATH =
  "M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z";

export function heartSvg(filled: boolean): string {
  return `<svg viewBox="0 0 24 24" fill="${filled ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${HEART_PATH}"/></svg>`;
}

export function infoSvg(): string {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`;
}
