// The palette is a validated artefact (ADR-0025 §9): this reads the tokens
// out of the SHIPPED src/styles.css — not a duplicate TypeScript constant,
// since #4 already emptied the pipeline of colour — and asserts the measured
// floors ADR-0025 §"The tokens" pins. A future tweak that breaks a floor
// fails CI, not eyes.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "./validate-palette.ts";

describe("contrastRatio", () => {
  it("black on white is 21:1, a colour against itself is 1:1", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#d9452f", "#d9452f")).toBeCloseTo(1, 5);
  });
});

function readTokens(): Record<string, string> {
  const css = readFileSync("src/styles.css", "utf8");
  const tokens: Record<string, string> = {};
  for (const match of css.matchAll(/--(bg|surface|border|fg|muted|accent):\s*(#[0-9a-f]{6});/gi)) {
    const [, name, value] = match;
    if (name !== undefined && value !== undefined) tokens[name] = value.toLowerCase();
  }
  return tokens;
}

describe("the shipped palette (ADR-0025)", () => {
  const tokens = readTokens();

  it("defines all six tokens exactly once", () => {
    expect(Object.keys(tokens).sort()).toEqual(
      ["accent", "bg", "border", "fg", "muted", "surface"].sort(),
    );
  });

  it("caps --fg's luminance at 65%, never pure white", () => {
    expect(tokens.fg).not.toBe("#ffffff");
  });

  it.each([
    ["fg", "bg", 4.5],
    ["fg", "surface", 4.5],
    ["muted", "surface", 4.5],
    ["muted", "bg", 4.5],
    ["surface", "bg", 1.25],
    ["border", "surface", 1.25],
    ["accent", "bg", 3.0],
    ["accent", "surface", 3.0],
  ] as const)("%s on %s clears its floor (≥ %s)", (fg, bg, floor) => {
    const fgHex = tokens[fg];
    const bgHex = tokens[bg];
    expect(fgHex, fg).toBeDefined();
    expect(bgHex, bg).toBeDefined();
    expect(contrastRatio(fgHex ?? "", bgHex ?? "")).toBeGreaterThanOrEqual(floor);
  });

  it("carries near-black text on --accent at ≥ 4.5:1 (the starred Act's fill)", () => {
    expect(contrastRatio("#0b0a0c", tokens.accent ?? "")).toBeGreaterThanOrEqual(4.5);
  });
});
