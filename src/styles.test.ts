// Declaration-level guards on the shipped stylesheet (#30), following
// validate-palette.test.ts's precedent of reading src/styles.css itself.
// happy-dom has no layout engine, so a defect's geometry cannot be asserted
// — but the declaration that caused it can, and every rule here is one that
// once shipped.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Declarations of every rule whose selector list names `selector` exactly, merged in source order. */
function declarations(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const match of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = (match[1] ?? "").split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const declaration of (match[2] ?? "").split(";")) {
      const colon = declaration.indexOf(":");
      if (colon === -1) continue;
      const property = declaration.slice(0, colon).trim();
      out[property] = declaration
        .slice(colon + 1)
        .trim()
        .replace(/\s+/g, " ");
    }
  }
  return out;
}

describe("the grid scrolls (#30)", () => {
  it("sizes .days to its content — an overflow-hidden flex item that could shrink clips the evening", () => {
    const days = declarations(".days");
    expect(days["overflow-y"]).toBe("hidden");
    expect(days.flex).toBe("0 0 auto");
    // A later longhand would win the cascade while the shorthand still reads clean.
    expect(days["flex-shrink"]).toBeUndefined();
  });

  it("keeps .schedule the one vertical scroller and .days the one horizontal — no per-pane scroll", () => {
    expect(declarations(".schedule")["overflow-y"]).toBe("auto");
    expect(declarations(".days")["overflow-x"]).toBe("auto");
    for (const selector of [".day", ".columns", ".column"]) {
      expect(declarations(selector).overflow, selector).toBeUndefined();
      expect(declarations(selector)["overflow-y"], selector).toBeUndefined();
    }
  });

  it("hides the scrollbars on both axes", () => {
    for (const selector of [".schedule", ".days"]) {
      expect(declarations(selector)["scrollbar-width"], selector).toBe("none");
      expect(declarations(`${selector}::-webkit-scrollbar`).display, selector).toBe("none");
    }
  });
});

describe("the Header sits still (#30, ADR-0026 §5, §6, §8)", () => {
  it("baseline-aligns the row, so the tabs share the wordmark's baseline", () => {
    expect(declarations(".app-header")["align-items"]).toBe("baseline");
    expect(declarations(".app-wordmark")["line-height"]).toBe("var(--header-height)");
  });

  it("takes the tabs to the row's height by symmetric negative margin plus padding, not by stretching", () => {
    const tab = declarations(".day-switcher-tab");
    expect(tab.height).toBeUndefined();
    expect(tab["block-size"]).toBeUndefined();
    expect(tab["align-self"]).toBeUndefined();
    expect(declarations(".day-switcher")["align-items"]).toBe("baseline");
    expect(tab["padding-block"]).toBe("calc((var(--header-height) - 1lh) / 2)");
    expect(tab["margin-block"]).toBe("calc((1lh - var(--header-height)) / 2)");
  });

  it("reserves the selected weight's width: a hidden bold copy shares the label's cell", () => {
    const label = declarations(".day-switcher-label");
    const reserve = declarations(".day-switcher-label-reserve");
    expect(label["grid-area"]).toBeDefined();
    expect(reserve["grid-area"]).toBe(label["grid-area"]);
    expect(reserve["font-weight"]).toBe("600");
    expect(reserve.visibility).toBe("hidden");
    // Hidden, not gone: display: none or position: absolute would drop it
    // out of track sizing and bring the shift back with every test green.
    expect(reserve.display).toBeUndefined();
    expect(reserve.position).toBeUndefined();
    expect(label["justify-self"]).toBe("center");
  });

  it("carries selected by weight and colour both", () => {
    const selected = declarations('.day-switcher-tab[aria-pressed="true"]');
    expect(selected["font-weight"]).toBe("600");
    expect(selected.color).toBe("var(--fg)");
  });

  it("bakes no magic px into the tab's width", () => {
    for (const selector of [".day-switcher-tab", ".day-switcher-label", ".day-switcher"]) {
      expect(declarations(selector)["min-width"] ?? "0", selector).not.toMatch(/px/);
      expect(declarations(selector).width, selector).toBeUndefined();
    }
  });
});

describe("chrome that stays out of the way (#30)", () => {
  it("sizes the Header icons in CSS at 22 px", () => {
    const svg = declarations(".app-actions svg");
    expect(svg.width).toBe("22px");
    expect(svg.height).toBe("22px");
  });

  it("keeps the Stage row above the Now line and its pill", () => {
    const z = (selector: string) => Number(declarations(selector)["z-index"]);
    expect(z(".stage-row")).toBeGreaterThan(z(".now-pill"));
    expect(z(".now-pill")).toBeGreaterThan(z(".now-line"));
  });
});

describe("the palette holds (#30, ADR-0025 §8)", () => {
  it("paints the NOW pill's text in --bg — near-black on --accent clears 4.5:1, white does not", () => {
    expect(declarations(".now-pill").color).toBe("var(--bg)");
  });
});
