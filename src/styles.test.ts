// Declaration-level guards on the shipped stylesheet (#30), following
// validate-palette.test.ts's precedent of reading src/styles.css itself.
// happy-dom has no layout engine, so a defect's geometry cannot be asserted
// — but the declaration that caused it can, and every rule here is one that
// once shipped.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("src/styles.css", "utf8").replace(/\/\*[\s\S]*?\*\//g, "");

/** Every rule in the sheet, in source order: its selector list and the declarations between the braces. */
function rules(): { selector: string; body: string }[] {
  return Array.from(css.matchAll(/([^{}]+)\{([^{}]*)\}/g), (match) => ({
    selector: (match[1] ?? "").trim(),
    body: match[2] ?? "",
  }));
}

/** Declarations of every rule whose selector list names `selector` exactly, merged in source order. */
function declarations(selector: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rule of rules()) {
    const selectors = rule.selector.split(",").map((s) => s.trim());
    if (!selectors.includes(selector)) continue;
    for (const declaration of rule.body.split(";")) {
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

describe("hour ticks (#31, story 12)", () => {
  it("rules every .column with a --border gradient, placed by the JS-set offset", () => {
    const column = declarations(".column");
    expect(column["background-image"]).toMatch(/^repeating-linear-gradient\(/);
    // The line is the first pixel of each period — swapped stops would put
    // every tick a period-minus-one below its hour.
    expect(column["background-image"]).toMatch(
      /var\(--border\) 0 1px,\s*transparent 1px var\(--hour-px\)/,
    );
    expect(column["background-image"]).not.toMatch(/--muted|--accent/);
    expect(column["background-position-y"]).toBe("var(--tick-offset)");
    // From the offset down, not tiled from y=0: no line on the top edge.
    expect(column["background-repeat"]).toBe("no-repeat");
    // The shorthand would reset the image — the colour is set as its longhand.
    expect(column.background).toBeUndefined();
    expect(column["background-color"]).toBe("var(--bg)");
    // Nor may any other rule reaching a column reset it later in the cascade.
    for (const { selector, body } of rules()) {
      if (selector === ".column" || !/\.column(?!s)\b/.test(selector)) continue;
      expect(body, selector).not.toMatch(/background(-image)?\s*:/);
    }
  });

  it("leaves the ticks alone under Focus — they are the ruler, not the content", () => {
    for (const { selector, body } of rules()) {
      if (!selector.includes(".focus")) continue;
      // Every Focus rule dims an act or something inside one — never a
      // column, a pane, or the token the ticks are drawn in.
      expect(selector).toMatch(/\.act\b/);
      expect(body, selector).not.toMatch(/--border\s*:|filter\s*:/);
    }
  });

  it("drops a dimmed act to the ground itself, so the rule runs on through it", () => {
    // An on-the-hour Act's top border sits on the tick row; painted --bg it
    // would cut the ruler across the block's width at every hour it dims.
    const dimmed = declarations(".schedule.focus .act:not(.starred)");
    expect(dimmed.background).toBe("transparent");
    expect(dimmed["border-color"]).toBe("transparent");
  });
});

describe("which Festival this is (#31, story 2)", () => {
  it("sets the pre-Reveal line in the display face, uppercase, in --fg", () => {
    const line = declarations(".unpublished-festival");
    expect(line["font-family"]).toBe("var(--display-font)");
    expect(line["text-transform"]).toBe("uppercase");
    expect(line.color).toBe("var(--fg)");
  });
});
