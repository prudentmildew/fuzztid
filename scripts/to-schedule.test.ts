import { describe, expect, it } from "vitest";
import type { Programme, ProgrammeAct } from "./broadcast.ts";
import { readProgramme } from "./broadcast.ts";
import type { EditionConfig } from "./edition-config.ts";
import { HOSTSABBAT_2025, HOSTSABBAT_2026 } from "./edition-config.ts";
import { toSchedule } from "./to-schedule.ts";

// A two-stage, two-day edition small enough to hand-compute expectations.
const CONFIG: EditionConfig = {
  festival: { id: "test-festival", name: "Test Festival" },
  days: ["2026-10-23", "2026-10-24"],
  stages: [
    { id: "main", name: "Main" },
    { id: "side", name: "Side" },
  ],
};

function act(overrides: Partial<ProgrammeAct> = {}): ProgrammeAct {
  return {
    id: "act-1",
    name: "Test Artist",
    date: "2026-10-23",
    start: "21:30",
    end: "23:00",
    stage: "Main",
    ...overrides,
  };
}

describe("toSchedule", () => {
  it("turns a Programme act into an Act on the right day and stage", () => {
    const schedule = toSchedule(
      [act({ id: "a1", name: "Dumdum Boys", start: "21:30", end: "23:00" })],
      CONFIG,
    );

    expect(schedule.stages).toEqual([
      { id: "main", name: "Main" },
      { id: "side", name: "Side" },
    ]);
    expect(schedule.days).toHaveLength(1);
    expect(schedule.days[0]).toEqual({
      date: "2026-10-23",
      start_min: 1290, // 21:30
      end_min: 1380, // 23:00
      acts: {
        main: [
          {
            id: "a1",
            name: "Dumdum Boys",
            start: "21:30",
            end: "23:00",
            start_min: 1290,
            end_min: 1380,
          },
        ],
        side: [],
      },
    });
  });

  it("throws on an unknown stage", () => {
    expect(() => toSchedule([act({ stage: "Nyscenen" })], CONFIG)).toThrowError(
      /unknown stage "Nyscenen"/i,
    );
  });

  it("throws on an unknown day, naming it a red run", () => {
    expect(() => toSchedule([act({ date: "2026-10-25" })], CONFIG)).toThrowError(
      /unknown day "2026-10-25"/i,
    );
  });

  it("throws when an act ends at or before its start", () => {
    expect(() =>
      toSchedule([act({ name: "Night Owl", start: "23:30", end: "01:00" })], CONFIG),
    ).toThrowError(/Night Owl.*01:00.*not after.*23:30/i);
    expect(() => toSchedule([act({ start: "12:00", end: "12:00" })], CONFIG)).toThrowError(
      /not after/i,
    );
  });

  it("throws when two acts share an id", () => {
    expect(() =>
      toSchedule(
        [
          act({ id: "dup", name: "Twin A" }),
          act({ id: "dup", name: "Twin B", start: "14:00", end: "15:00" }),
        ],
        CONFIG,
      ),
    ).toThrowError(/duplicate act id "dup"/i);
  });

  it("throws on a per-stage overlap, allowing back-to-back", () => {
    expect(() =>
      toSchedule(
        [
          act({ id: "a1", name: "First", start: "20:00", end: "21:00" }),
          act({ id: "a2", name: "Second", start: "20:30", end: "21:30" }),
        ],
        CONFIG,
      ),
    ).toThrowError(/"Second".*overlaps.*"First"/i);

    // Back-to-back: one ends 21:00, the next starts 21:00 — no throw.
    expect(() =>
      toSchedule(
        [
          act({ id: "a1", name: "First", start: "20:00", end: "21:00" }),
          act({ id: "a2", name: "Second", start: "21:00", end: "22:00" }),
        ],
        CONFIG,
      ),
    ).not.toThrow();
  });

  it("allows overlapping acts on different stages", () => {
    expect(() =>
      toSchedule(
        [
          act({ id: "a1", stage: "Main", start: "20:00", end: "21:00" }),
          act({ id: "a2", stage: "Side", start: "20:00", end: "21:00" }),
        ],
        CONFIG,
      ),
    ).not.toThrow();
  });

  it("groups a configured date with no Acts into no pane at all", () => {
    const schedule = toSchedule([act({ date: "2026-10-23" })], CONFIG);
    expect(schedule.days.map((d) => d.date)).toEqual(["2026-10-23"]);
  });

  it("sorts days by date and acts by start time within a stage", () => {
    const schedule = toSchedule(
      [
        act({
          id: "thu-act",
          name: "Second Day",
          date: "2026-10-24",
          start: "12:00",
          end: "13:00",
        }),
        act({ id: "wed-late", name: "Wed Late", start: "18:00", end: "19:00" }),
        act({ id: "wed-early", name: "Wed Early", start: "11:00", end: "12:00" }),
        act({ id: "wed-side", name: "Wed Side", stage: "Side", start: "22:00", end: "22:45" }),
      ],
      CONFIG,
    );

    expect(schedule.days.map((d) => d.date)).toEqual(["2026-10-23", "2026-10-24"]);
    const wed = schedule.days[0];
    expect(wed?.acts.main?.map((a) => a.name)).toEqual(["Wed Early", "Wed Late"]);
    // The day envelope spans all stages: 11:00 (main) to 22:45 (side).
    expect(wed?.start_min).toBe(660);
    expect(wed?.end_min).toBe(1365);
  });

  it("is input-order invariant, so nightly reruns produce byte-identical JSON", () => {
    const acts: Programme = [
      act({ id: "a1", start: "18:00", end: "19:00" }),
      act({ id: "a2", stage: "Side", start: "19:00", end: "20:00" }),
      act({ id: "a3", date: "2026-10-24", start: "20:00", end: "21:00" }),
    ];
    const forward = toSchedule(acts, CONFIG);
    const reversed = toSchedule([...acts].reverse(), CONFIG);
    expect(JSON.stringify(reversed)).toBe(JSON.stringify(forward));
  });
});

describe("toSchedule(null, config) — the unpublished Schedule", () => {
  it("returns the Edition's Days and Stages, no Acts, envelope zeroed", () => {
    const schedule = toSchedule(null, CONFIG);
    expect(schedule.stages).toEqual(CONFIG.stages);
    expect(schedule.days).toEqual([
      { date: "2026-10-23", start_min: 0, end_min: 0, acts: { main: [], side: [] } },
      { date: "2026-10-24", start_min: 0, end_min: 0, acts: { main: [], side: [] } },
    ]);
  });
});

describe("the golden test — fixture provenance from the real 2025 payload", () => {
  it("produces the pinned 2025 Schedule (toMatchFileSnapshot regenerates with vitest -u)", async () => {
    const fixture = (await import("./fixtures/broadcast-2025.json")).default;
    const programme = readProgramme(fixture);
    const schedule = toSchedule(programme, HOSTSABBAT_2025);

    await expect(JSON.stringify(schedule, null, 2)).toMatchFileSnapshot(
      "../src/fixtures/schedule.fixture.json",
    );
  });
});

describe("the 2026 payload as it stands today — the pre-Reveal dry run", () => {
  it("drops the placeholder Lineup and yields the unpublished Schedule", async () => {
    // Every act stageless on one shared 13:00Z–23:00Z slot. Read end to end
    // rather than as two unit tests, because the pre-Reveal state is the one
    // the deployed app renders for two months.
    const fixture = (await import("./fixtures/broadcast-2026.json")).default;
    const schedule = toSchedule(readProgramme(fixture), HOSTSABBAT_2026);

    expect(schedule.stages).toEqual(HOSTSABBAT_2026.stages);
    expect(schedule.days.map((d) => d.date)).toEqual(HOSTSABBAT_2026.days);
    // The Edition's Days come from the config here, not from the data —
    // the placeholder slot's single date must not become a single pane.
    for (const day of schedule.days) {
      expect(Object.values(day.acts).flat(), day.date).toEqual([]);
      expect(day.start_min).toBe(0);
      expect(day.end_min).toBe(0);
    }
  });
});
