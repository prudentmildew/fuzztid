import { describe, expect, it, vi } from "vitest";
import { createDaySwitcher } from "./day-switcher.ts";
import type { Day } from "./schedule.ts";

function makeDay(date: string): Day {
  return { date, start_min: 0, end_min: 0, acts: {} };
}

const days: Day[] = [makeDay("2026-10-23"), makeDay("2026-10-24")];

function tabs(element: HTMLElement): HTMLButtonElement[] {
  return Array.from(element.querySelectorAll(".day-switcher-tab"));
}

describe("createDaySwitcher", () => {
  it("builds two plain buttons, not a tablist", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    expect(switcher.element.getAttribute("role")).toBeNull();
    const buttons = tabs(switcher.element);
    expect(buttons.length).toBe(2);
    for (const button of buttons) {
      expect(button.tagName).toBe("BUTTON");
      expect(button.getAttribute("role")).toBeNull();
    }
  });

  it("labels the tabs weekday and day-of-month, uppercase, no month", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    const [fri, sat] = tabs(switcher.element);
    expect(fri?.querySelector(".day-switcher-label")?.textContent).toBe("FRI 23");
    expect(sat?.querySelector(".day-switcher-label")?.textContent).toBe("SAT 24");
  });

  it("calls onSelect with a tab's date when tapped", () => {
    const onSelect = vi.fn();
    const switcher = createDaySwitcher({ days, onSelect });
    tabs(switcher.element)[1]?.click();
    expect(onSelect).toHaveBeenCalledWith("2026-10-24");
  });

  it("carries selected by aria-pressed", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    switcher.update("2026-10-24", null);
    const [fri, sat] = tabs(switcher.element);
    expect(fri?.getAttribute("aria-pressed")).toBe("false");
    expect(sat?.getAttribute("aria-pressed")).toBe("true");
  });

  it("carries today by aria-current, independent of which tab is selected", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    // The Saturday case: selected and today land on different tabs.
    switcher.update("2026-10-24", "2026-10-23");
    const [fri, sat] = tabs(switcher.element);
    expect(fri?.getAttribute("aria-current")).toBe("date");
    expect(fri?.getAttribute("aria-pressed")).toBe("false");
    expect(sat?.getAttribute("aria-current")).toBeNull();
    expect(sat?.getAttribute("aria-pressed")).toBe("true");
  });

  it("clears aria-current and the today marker when no Day is today", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    switcher.update("2026-10-24", "2026-10-23");
    switcher.update("2026-10-24", null);
    for (const button of tabs(switcher.element)) {
      expect(button.getAttribute("aria-current")).toBeNull();
      expect(button.dataset.today).toBe("false");
    }
  });

  it("reserves the dot's box for every tab, marking today via a data attribute", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    switcher.update("2026-10-23", "2026-10-23");
    const [fri, sat] = tabs(switcher.element);
    expect(fri?.querySelector(".day-switcher-dot")).not.toBeNull();
    expect(sat?.querySelector(".day-switcher-dot")).not.toBeNull();
    expect(fri?.dataset.today).toBe("true");
    expect(sat?.dataset.today).toBe("false");
  });

  it("reserves the selected weight's box: a hidden bold copy of the label rides every tab (#30)", () => {
    const switcher = createDaySwitcher({ days, onSelect: vi.fn() });
    for (const button of tabs(switcher.element)) {
      const label = button.querySelector(".day-switcher-label");
      const reserve = button.querySelector(".day-switcher-label-reserve");
      expect(reserve?.textContent).toBe(label?.textContent);
      expect(reserve?.getAttribute("aria-hidden")).toBe("true");
    }
  });
});
