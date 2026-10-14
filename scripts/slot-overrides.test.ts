import { describe, expect, it } from "vitest";
import type { ProgrammeAct } from "./broadcast.ts";
import { applySlotOverrides, type SlotOverride } from "./slot-overrides.ts";

const OVERRIDE: SlotOverride = {
  id: "placeholder-act",
  name: "Placeholder Act",
  expected: { date: "2026-10-23", start: "19:00", end: "22:59" },
  replacement: { start: "19:00", end: "20:15" },
};

function act(overrides: Partial<ProgrammeAct> = {}): ProgrammeAct {
  return {
    id: "placeholder-act",
    name: "Placeholder Act",
    date: "2026-10-23",
    start: "19:00",
    end: "22:59",
    stage: "Main",
    ...overrides,
  };
}

describe("applySlotOverrides", () => {
  it("replaces the slot while the feed still carries the placeholder", () => {
    const other = act({ id: "other", name: "Other", start: "20:30", end: "21:15" });

    const result = applySlotOverrides([act(), other], [OVERRIDE]);

    expect(result).toEqual([act({ start: "19:00", end: "20:15" }), other]);
  });

  it("goes red once the feed has a different slot for the act", () => {
    expect(() => applySlotOverrides([act({ start: "18:30", end: "19:15" })], [OVERRIDE])).toThrow(
      /Broadcast now has "Placeholder Act".*18:30–19:15.*remove the override/,
    );
  });

  it("goes red even when the feed agrees with the override", () => {
    // Still stale: the feed is fixed and the override is dead weight.
    expect(() => applySlotOverrides([act({ end: "20:15" })], [OVERRIDE])).toThrow(
      /The feed has changed/,
    );
  });

  it("goes red when the act has left the feed", () => {
    expect(() => applySlotOverrides([act({ id: "someone-else" })], [OVERRIDE])).toThrow(
      /no longer in the Broadcast feed/,
    );
  });

  it("goes red when the feed is back to no Programme", () => {
    expect(() => applySlotOverrides(null, [OVERRIDE])).toThrow(/no Programme/);
  });

  it("is a no-op with no overrides", () => {
    expect(applySlotOverrides(null, [])).toBeNull();
    expect(applySlotOverrides([act()], [])).toEqual([act()]);
  });
});
