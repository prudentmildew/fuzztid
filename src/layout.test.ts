import { describe, expect, it } from "vitest";
import { hourTickOffsetPx, pxFromMin, sharedOrigin } from "./layout.ts";
import type { Day, Schedule } from "./schedule.ts";

function makeDay(overrides: Partial<Day> = {}): Day {
  return {
    date: "2026-10-23",
    start_min: 600,
    end_min: 660,
    acts: {},
    ...overrides,
  };
}

describe("sharedOrigin", () => {
  it("spans the earliest start_min and latest end_min across all days", () => {
    const schedule: Schedule = {
      stages: [],
      days: [
        { ...makeDay(), start_min: 840, end_min: 1410 },
        { ...makeDay(), start_min: 750, end_min: 1380 },
        { ...makeDay(), start_min: 780, end_min: 1410 },
      ],
    };
    expect(sharedOrigin(schedule)).toEqual({ startMin: 750, endMin: 1410 });
  });

  it("handles a sparse day inside a wider envelope", () => {
    const schedule: Schedule = {
      stages: [],
      days: [
        { ...makeDay(), start_min: 1290, end_min: 1320 },
        { ...makeDay(), start_min: 660, end_min: 1380 },
      ],
    };
    expect(sharedOrigin(schedule)).toEqual({ startMin: 660, endMin: 1380 });
  });
});

describe("pxFromMin", () => {
  it("returns 0 at the origin start", () => {
    expect(pxFromMin(600, { startMin: 600, endMin: 720 }, 2)).toBe(0);
  });

  it("returns (min − origin.startMin) × pxPerMinute", () => {
    expect(pxFromMin(645, { startMin: 600, endMin: 720 }, 2)).toBe(90);
  });

  it("positions a value before the origin as a negative offset", () => {
    expect(pxFromMin(590, { startMin: 600, endMin: 720 }, 2)).toBe(-20);
  });
});

// Hour ticks (#31, story 12): the first whole hour strictly after the origin
// starts, in px from the top of the grid — never the origin itself, which
// is the grid's top edge, whether or not it happens to fall on the hour.
describe("hourTickOffsetPx", () => {
  it.each([
    [900, 120], // 15:00 → 16:00 is a full hour down (the 2025 fixture)
    [930, 60], // 15:30 → 16:00
    [959, 2], // 15:59 → 16:00, one minute
    [960, 120], // 16:00 on the dot → 17:00, not a line on the top edge
    [0, 120], // midnight → 01:00
  ])("from start_min %i puts the first tick at %i px at 2 px/min", (startMin, px) => {
    expect(hourTickOffsetPx({ startMin, endMin: 1439 }, 2)).toBe(px);
  });

  it("scales with the px-per-minute", () => {
    expect(hourTickOffsetPx({ startMin: 930, endMin: 1439 }, 3)).toBe(90);
  });
});
