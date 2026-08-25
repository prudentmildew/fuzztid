// Contract test for the REAL committed data/schedule.json.
//
// The hourly refresh (ADR-0023/0024) rewrites this file from Broadcast and
// deploys straight after, so nothing here may pin programme content — no act
// names, no counts, no dates beyond the edition config. What it does pin is
// the shape the app relies on: if fetch-schedule.ts ever emits something
// main.ts cannot render, this fails instead of the site quietly going blank.
// It must pass in both the published and unpublished states.
import { describe, expect, it } from "vitest";
import scheduleData from "../data/schedule.json";
import { HOSTSABBAT_2026 } from "../scripts/edition-config.ts";
import type { Schedule } from "./schedule.ts";

const schedule = scheduleData as Schedule;
const configuredStageIds = HOSTSABBAT_2026.stages.map((s) => s.id);
const allActs = schedule.days.flatMap((d) => Object.values(d.acts).flat());

describe("data/schedule.json — stages", () => {
  it("carries every configured Stage, in edition-config order", () => {
    expect(schedule.stages).toEqual(HOSTSABBAT_2026.stages);
  });
});

describe("data/schedule.json — days", () => {
  it("uses ISO dates drawn from the edition config, in ascending order", () => {
    const dates = schedule.days.map((d) => d.date);
    for (const date of dates) expect(HOSTSABBAT_2026.days).toContain(date);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBe(dates.length);
  });

  it("keys acts by every configured Stage id, and nothing else", () => {
    for (const day of schedule.days) {
      expect(Object.keys(day.acts).sort(), day.date).toEqual([...configuredStageIds].sort());
    }
  });

  it("gives each day an envelope that contains its own acts", () => {
    for (const day of schedule.days) {
      const acts = Object.values(day.acts).flat();
      // >= rather than > : an unpublished day's envelope is the honest
      // degenerate start_min: 0, end_min: 0, with no acts to contain.
      expect(day.end_min, `${day.date} envelope`).toBeGreaterThanOrEqual(day.start_min);
      for (const act of acts) {
        expect(act.start_min, `${day.date} ${act.name} start`).toBeGreaterThanOrEqual(
          day.start_min,
        );
        expect(act.end_min, `${day.date} ${act.name} end`).toBeLessThanOrEqual(day.end_min);
      }
    }
  });
});

describe("data/schedule.json — acts", () => {
  it("gives every act a stable, unique id — the Favourites hook", () => {
    for (const act of allActs) expect(act.id, act.name).toBeTruthy();
    const ids = allActs.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("agrees between HH:MM and its *_min counterpart", () => {
    for (const act of allActs) {
      const [startH = 0, startM = 0] = act.start.split(":").map(Number);
      const [endH = 0, endM = 0] = act.end.split(":").map(Number);
      expect(act.start_min, `${act.name} start`).toBe(startH * 60 + startM);
      expect(act.end_min, `${act.name} end`).toBe(endH * 60 + endM);
    }
  });

  it("ends after it starts", () => {
    for (const act of allActs) {
      expect(act.end_min, act.name).toBeGreaterThan(act.start_min);
    }
  });

  it("has no per-stage overlap", () => {
    for (const day of schedule.days) {
      for (const [stageId, acts] of Object.entries(day.acts)) {
        const sorted = [...acts].sort((a, b) => a.start_min - b.start_min);
        for (let i = 1; i < sorted.length; i++) {
          const prev = sorted[i - 1];
          const curr = sorted[i];
          if (prev === undefined || curr === undefined) continue;
          expect(
            curr.start_min,
            `${day.date} ${stageId}: "${curr.name}" vs "${prev.name}"`,
          ).toBeGreaterThanOrEqual(prev.end_min);
        }
      }
    }
  });
});
