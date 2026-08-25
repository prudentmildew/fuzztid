// Objective palette validation (ADR-0025 §9): with one fill there are no
// pairs to keep distinct, so this drops to the WCAG contrast helper.
// scripts/validate-palette.test.ts reads the shipped src/styles.css and
// asserts the measured floors ADR-0025 pins.

function hexToLinearRgb(hex: string): [number, number, number] {
  const srgb = [1, 3, 5].map((i) => Number.parseInt(hex.slice(i, i + 2), 16) / 255);
  const [r = 0, g = 0, b = 0] = srgb.map((c) =>
    c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4,
  );
  return [r, g, b];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToLinearRgb(hex);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.x contrast ratio between two colours, ≥ 1. */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return ((hi ?? 0) + 0.05) / ((lo ?? 0) + 0.05);
}
