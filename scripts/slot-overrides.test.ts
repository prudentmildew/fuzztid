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

    expect(result).toEqual({
      programme: [act({ start: "19:00", end: "20:15" }), other],
      stale: [],
    });
  });

  it("steps aside for the feed's slot once Broadcast publishes one, and reports itself stale", () => {
    const fixed = act({ start: "18:30", end: "19:15" });

    const result = applySlotOverrides([fixed], [OVERRIDE]);

    expect(result.programme).toEqual([fixed]);
    expect(result.stale).toHaveLength(1);
    expect(result.stale[0]?.reason).toMatch(/Broadcast now has "Placeholder Act".*18:30–19:15/);
  });

  it("steps aside when the feed agrees with the override, and reports itself stale", () => {
    const fixed = act({ end: "20:15" });

    const result = applySlotOverrides([fixed], [OVERRIDE]);

    expect(result.programme).toEqual([fixed]);
    expect(result.stale).toHaveLength(1);
  });

  it("steps aside when the act has left the feed, and reports itself stale", () => {
    const other = act({ id: "someone-else" });

    const result = applySlotOverrides([other], [OVERRIDE]);

    expect(result.programme).toEqual([other]);
    expect(result.stale[0]?.reason).toMatch(/no longer in the Broadcast feed/);
  });

  it("still goes red when the feed is back to no Programme", () => {
    // Not a schedule being published: stepping aside here would write the
    // unpublished Schedule over the real one.
    expect(() => applySlotOverrides(null, [OVERRIDE])).toThrow(/no Programme/);
  });

  it("is a no-op with no overrides", () => {
    expect(applySlotOverrides(null, [])).toEqual({ programme: null, stale: [] });
    expect(applySlotOverrides([act()], [])).toEqual({ programme: [act()], stale: [] });
  });
});
