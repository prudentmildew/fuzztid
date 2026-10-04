import { describe, expect, it } from "vitest";
import { broadcastUrl, readProgramme } from "./broadcast.ts";

function broadcastAct(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    objectId: "AuYNElzODS",
    name: "Crouch",
    start_time_iso: "2025-10-24T14:00:00.000Z",
    end_time_iso: "2025-10-24T15:00:00.000Z",
    externalVenueName: "The Crypt",
    isMainSchedule: true,
    ...overrides,
  };
}

describe("readProgramme", () => {
  it("throws when the payload is not an array", () => {
    expect(() => readProgramme({ result: [] })).toThrowError(/not an array/i);
  });

  it("returns null when every act is stageless (pre-Reveal)", () => {
    expect(
      readProgramme([
        broadcastAct({ externalVenueName: "" }),
        broadcastAct({ externalVenueName: "" }),
      ]),
    ).toBeNull();
  });

  it("returns null when every Stage's Day sits on one placeholder slot, Stages assigned", () => {
    // The feed as seen in October 2026: Stages filled in, every act on its
    // Day's 15:00–23:59 slot. No running order means no Programme, not an
    // overlap — and Friday's and Saturday's slots are different instants.
    const friday = {
      start_time_iso: "2026-10-23T13:00:00.000Z",
      end_time_iso: "2026-10-23T21:59:00.000Z",
    };
    const saturday = {
      start_time_iso: "2026-10-24T13:00:00.000Z",
      end_time_iso: "2026-10-24T21:59:00.000Z",
    };
    expect(
      readProgramme([
        broadcastAct({ objectId: "a", externalVenueName: "Church of Riffs", ...friday }),
        broadcastAct({ objectId: "b", externalVenueName: "Church of Riffs", ...friday }),
        broadcastAct({ objectId: "c", externalVenueName: "The Crypt", ...friday }),
        broadcastAct({ objectId: "d", externalVenueName: "The Crypt", ...friday }),
        broadcastAct({ objectId: "e", externalVenueName: "Church of Riffs", ...saturday }),
        broadcastAct({ objectId: "f", externalVenueName: "Church of Riffs", ...saturday }),
        broadcastAct({ objectId: "g", externalVenueName: "Kafé Hærverk", ...saturday }),
      ]),
    ).toBeNull();
  });

  it("returns null when every Stage's Day shares a slot and some acts are still stageless", () => {
    // Stages half-entered on top of placeholder times is still "no times":
    // the placeholder check wins over the partial-Reveal throw.
    expect(
      readProgramme([
        broadcastAct({ objectId: "a", externalVenueName: "" }),
        broadcastAct({ objectId: "b", externalVenueName: "" }),
        broadcastAct({ objectId: "c" }),
        broadcastAct({ objectId: "d" }),
      ]),
    ).toBeNull();
  });

  it("reads a single act as a Programme even though it has nothing to differ from", () => {
    expect(readProgramme([broadcastAct()])).toHaveLength(1);
  });

  it("reads parallel sets across different Stages as a Programme, not a placeholder", () => {
    // Two rooms playing at once is an ordinary night; only acts sharing a
    // Stage and a Day are compared.
    const programme = readProgramme([
      broadcastAct({ objectId: "a", externalVenueName: "The Crypt" }),
      broadcastAct({ objectId: "b", externalVenueName: "Church of Riffs" }),
    ]);
    expect(programme).toHaveLength(2);
  });

  it("passes a Stage still on its placeholder beside a timed one through, for the assembler", () => {
    // A running order entered for one Stage and not another is a partial
    // entry. It is not this predicate's to catch: the Programme goes to
    // toSchedule, whose per-Stage no-overlap invariant throws on the Stage
    // still stacked on its slot (ADR-0023 §7).
    const programme = readProgramme([
      broadcastAct({ objectId: "a", externalVenueName: "Church of Riffs" }),
      broadcastAct({ objectId: "b", externalVenueName: "Church of Riffs" }),
      broadcastAct({
        objectId: "c",
        externalVenueName: "The Crypt",
        start_time_iso: "2025-10-24T13:00:00.000Z",
      }),
      broadcastAct({ objectId: "d", externalVenueName: "The Crypt" }),
    ]);
    expect(programme).toHaveLength(4);
  });

  it("passes acts on the placeholder beside timed ones on the same Stage through", () => {
    const programme = readProgramme([
      broadcastAct({ objectId: "a", start_time_iso: "2025-10-24T13:00:00.000Z" }),
      broadcastAct({ objectId: "b" }),
      broadcastAct({ objectId: "c" }),
    ]);
    expect(programme).toHaveLength(3);
  });

  it("returns null for an empty payload", () => {
    expect(readProgramme([])).toBeNull();
  });

  it("throws on a partial Reveal — some acts stageless, some not, times entered", () => {
    expect(() =>
      readProgramme([
        broadcastAct({ objectId: "a", externalVenueName: "" }),
        broadcastAct({ objectId: "b", start_time_iso: "2025-10-24T13:00:00.000Z" }),
      ]),
    ).toThrowError(/partial reveal/i);
  });

  it("throws when isMainSchedule is not true", () => {
    expect(() => readProgramme([broadcastAct({ isMainSchedule: false })])).toThrowError(
      /isMainSchedule.*false/i,
    );
  });

  it("throws on a malformed start_time_iso", () => {
    expect(() => readProgramme([broadcastAct({ start_time_iso: "not-a-date" })])).toThrowError(
      /malformed "start_time_iso"/i,
    );
  });

  it("throws on a missing objectId", () => {
    expect(() => readProgramme([broadcastAct({ objectId: undefined })])).toThrowError(
      /no string "objectId"/i,
    );
  });

  it("builds a Programme, converting a CEST instant to Oslo wall-clock", () => {
    const programme = readProgramme([
      broadcastAct({
        start_time_iso: "2025-10-24T14:00:00.000Z",
        end_time_iso: "2025-10-24T15:00:00.000Z",
      }),
    ]);
    // CEST is UTC+2 in late October, before the DST switch.
    expect(programme).toEqual([
      {
        id: "AuYNElzODS",
        name: "Crouch",
        date: "2025-10-24",
        start: "16:00",
        end: "17:00",
        stage: "The Crypt",
      },
    ]);
  });

  it("converts a CET instant to Oslo wall-clock, after the DST switch", () => {
    // 2025-10-26 01:00 UTC is the switch to CET (UTC+1); this instant is just after it.
    const programme = readProgramme([
      broadcastAct({
        start_time_iso: "2025-10-26T10:00:00.000Z",
        end_time_iso: "2025-10-26T11:00:00.000Z",
      }),
    ]);
    expect(programme?.[0]).toMatchObject({ date: "2025-10-26", start: "11:00", end: "12:00" });
  });

  it("carries a midnight-crossing act as end < start on the act's Oslo start date", () => {
    // 23:30 CEST start, 01:00 CEST end the next Oslo day — only the
    // wall-clock time survives for `end`, on purpose (see to-schedule.ts).
    const programme = readProgramme([
      broadcastAct({
        start_time_iso: "2025-10-24T21:30:00.000Z",
        end_time_iso: "2025-10-24T23:00:00.000Z",
      }),
    ]);
    expect(programme?.[0]).toMatchObject({ date: "2025-10-24", start: "23:30", end: "01:00" });
  });
});

describe("broadcastUrl", () => {
  it("builds the programme endpoint URL from a festival id and key", () => {
    expect(broadcastUrl("XIanfZspWO", "the-key")).toBe(
      "https://demo.broadcastapp.no/api/v1/festivals?key=the-key&festival=XIanfZspWO",
    );
  });
});

describe("readProgramme against the captured fixtures", () => {
  it("reads the 2025 fixture as a published Programme of 25 acts", async () => {
    const fixture = (await import("./fixtures/broadcast-2025.json")).default;
    const programme = readProgramme(fixture);
    expect(programme).not.toBeNull();
    expect(programme).toHaveLength(25);
    expect(new Set(programme?.map((a) => a.id)).size).toBe(25);
    expect(new Set(programme?.map((a) => a.stage))).toEqual(
      new Set(["The Chapel", "The Crypt", "Verkstedet"]),
    );
  });

  it("reads the 2026 fixture as the unpublished null Programme", async () => {
    const fixture = (await import("./fixtures/broadcast-2026.json")).default;
    expect(readProgramme(fixture)).toBeNull();
  });
});
