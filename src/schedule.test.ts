import { describe, expect, it } from "vitest";
import { editionYear, type Schedule } from "./schedule.ts";

function scheduleOn(dates: string[]): Schedule {
  return {
    stages: [],
    days: dates.map((date) => ({ date, start_min: 0, end_min: 0, acts: {} })),
  };
}

describe("editionYear", () => {
  it("is the year of the first Day — the Schedule carries no Edition field (ADR-0024 §2)", () => {
    expect(editionYear(scheduleOn(["2026-10-23", "2026-10-24"]))).toBe("2026");
    expect(editionYear(scheduleOn(["2025-10-24", "2025-10-25"]))).toBe("2025");
  });

  it("throws on a Schedule with no Days — there is no Edition to derive", () => {
    expect(() => editionYear(scheduleOn([]))).toThrow(/no Days/);
  });
});
