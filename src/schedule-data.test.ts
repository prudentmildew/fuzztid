// Contract test for the REAL committed data/schedule.json.
//
// The hourly refresh (ADR-0023 §2, ADR-0028 §5–§6) rewrites this file from
// Broadcast and deploys straight after, so nothing here may pin programme
// content — no act names, no counts, no dates beyond the edition config. A
// legitimate programme change must never become a red deploy. What it does
// pin is the shape the app relies on: if fetch-schedule.ts ever emits
// something main.ts cannot render, this fails instead of the site quietly
// going blank.
//
// The contract is written once and run against BOTH states, because the
// committed artifact is only ever in one of them at a time. Today it is the
// unpublished 2026 Schedule; at the Reveal it becomes a published one, and
// the contract that guards it must already have been proven against a
// published subject by then — the Reveal is the one day nothing may break.
// The published subject is the app's own 2025 fixture, whose provenance is
// the golden test in scripts/to-schedule.test.ts. It is deliberately NOT
// data/schedule.json.
import { describe, expect, it } from "vitest";
import committedSchedule from "../data/schedule.json";
import type { EditionConfig } from "../scripts/edition-config.ts";
import { HOSTSABBAT_2025, HOSTSABBAT_2026 } from "../scripts/edition-config.ts";
import publishedFixture from "./fixtures/schedule.fixture.json";
import { isPublished, type Schedule } from "./schedule.ts";

function scheduleContract(label: string, schedule: Schedule, config: EditionConfig): void {
  const configuredStageIds = config.stages.map((s) => s.id);
  const allActs = schedule.days.flatMap((d) => Object.values(d.acts).flat());

  describe(`${label} — stages`, () => {
    it("carries every configured Stage, in edition-config order", () => {
      expect(schedule.stages).toEqual(config.stages);
    });
  });

  describe(`${label} — days`, () => {
    it("uses ISO dates drawn from the edition config, in ascending order", () => {
      const dates = schedule.days.map((d) => d.date);
      for (const date of dates) expect(config.days).toContain(date);
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

  describe(`${label} — acts`, () => {
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
}

// The committed artifact, in whichever state the cron last left it.
scheduleContract("data/schedule.json", committedSchedule as Schedule, HOSTSABBAT_2026);

// The same contract, held against a published Schedule — so the state
// data/schedule.json flips into at the Reveal is under test months early.
scheduleContract("a published Schedule", publishedFixture as Schedule, HOSTSABBAT_2025);

describe("the published subject", () => {
  it("is genuinely published, so the published branch of the contract is really run", () => {
    // The guard is on the *fixture*, never on data/schedule.json: asserting
    // the committed file's state would make the Reveal itself a red deploy.
    expect(isPublished(publishedFixture as Schedule)).toBe(true);
  });
});
