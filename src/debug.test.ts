// The dev-only debug switch (#29): `?schedule=2025` swaps in the 2025
// fixture, `?now=…` pins the clock as an Oslo wall-clock *offset*. One
// exported function is the whole surface, so the parsing and the offset
// arithmetic are pinned through it (ADR-0024 §8's "the interface is the
// test surface"), and the Oslo interpretation is pinned under a host zone
// that is not Oslo — this laptop's is, which is exactly how the bug hides.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { applyDebugParams } from "./debug.ts";
import type { Schedule } from "./schedule.ts";

const PRODUCTION: Schedule = {
  stages: [{ id: "the-chapel", name: "The Chapel" }],
  days: [
    { date: "2026-10-23", start_min: 0, end_min: 0, acts: { "the-chapel": [] } },
    { date: "2026-10-24", start_min: 0, end_min: 0, acts: { "the-chapel": [] } },
  ],
};

// Oslo is CEST (UTC+2) on 24 October 2025 and CET (UTC+1) on 24 December.
const FRI_2030_OSLO = "2025-10-24T18:30:00.000Z";
const BOOT = new Date("2026-08-25T12:00:00Z");

const url = (query: string) => `http://localhost:5173/${query}`;

let warn: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ now: BOOT });
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  warn.mockRestore();
});

describe("applyDebugParams with no params", () => {
  it("passes the production Schedule and the real clock straight through", async () => {
    const { schedule, now } = await applyDebugParams(url(""), PRODUCTION);
    expect(schedule).toBe(PRODUCTION);
    expect(now().toISOString()).toBe(BOOT.toISOString());
    expect(warn).not.toHaveBeenCalled();
  });
});

describe("?schedule=2025", () => {
  it("renders the 2025 fixture instead of the production Schedule", async () => {
    const { schedule } = await applyDebugParams(url("?schedule=2025"), PRODUCTION);
    expect(schedule.days.map((d) => d.date)).toEqual(["2025-10-24", "2025-10-25"]);
    expect(Object.values(schedule.days[0]?.acts ?? {}).flat().length).toBeGreaterThan(0);
  });

  it("alone, defaults the clock to that Schedule's first Day at 20:30 Oslo — a live grid, not a dormant one", async () => {
    const { now } = await applyDebugParams(url("?schedule=2025"), PRODUCTION);
    expect(now().toISOString()).toBe(FRI_2030_OSLO);
  });
});

describe("?now=", () => {
  it("pins the clock without touching the Schedule — the two params are independent", async () => {
    const { schedule, now } = await applyDebugParams(url("?now=2025-10-24T20:30"), PRODUCTION);
    expect(schedule).toBe(PRODUCTION);
    expect(now().toISOString()).toBe(FRI_2030_OSLO);
  });

  it("wins over the ?schedule= default when both are given", async () => {
    const { now } = await applyDebugParams(url("?schedule=2025&now=2025-10-25T22:00"), PRODUCTION);
    expect(now().toISOString()).toBe("2025-10-25T20:00:00.000Z");
  });

  it("is an offset, not a freeze: the pinned clock keeps running", async () => {
    const { now } = await applyDebugParams(url("?now=2025-10-24T20:30"), PRODUCTION);
    vi.advanceTimersByTime(90_000);
    expect(now().toISOString()).toBe("2025-10-24T18:31:30.000Z");
  });

  it("reads a winter instant at CET, not a hard-coded +2", async () => {
    const { now } = await applyDebugParams(url("?now=2025-12-24T20:30"), PRODUCTION);
    expect(now().toISOString()).toBe("2025-12-24T19:30:00.000Z");
  });

  it("takes midnight as 00:00 of that date, never 24:00 of the one before", async () => {
    const { now } = await applyDebugParams(url("?now=2025-10-25T00:00"), PRODUCTION);
    expect(now().toISOString()).toBe("2025-10-24T22:00:00.000Z");
  });

  it("reads the autumn hour that happens twice at its second, CET occurrence", async () => {
    const { now } = await applyDebugParams(url("?now=2025-10-26T02:30"), PRODUCTION);
    expect(now().toISOString()).toBe("2025-10-26T01:30:00.000Z");
  });
});

describe("the Oslo interpretation under a non-Oslo host zone", () => {
  const hostTz = process.env.TZ;

  beforeEach(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  afterEach(() => {
    if (hostTz === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = hostTz;
    }
  });

  it("is pinned: the host zone is genuinely not Oslo, and the pin is still Oslo wall-clock", async () => {
    // Precondition — the bare Date parse that the ticket warns against
    // really does give a different instant here.
    expect(new Date("2025-10-24T20:30").toISOString()).not.toBe(FRI_2030_OSLO);
    const { now } = await applyDebugParams(url("?now=2025-10-24T20:30"), PRODUCTION);
    expect(now().toISOString()).toBe(FRI_2030_OSLO);
  });
});

describe("an unrecognised value", () => {
  it.each(["1999", "", "fixture"])(
    "?schedule=%s warns, naming the value and the accepted ones, and boots on real data",
    async (value) => {
      const { schedule, now } = await applyDebugParams(url(`?schedule=${value}`), PRODUCTION);
      expect(schedule).toBe(PRODUCTION);
      expect(now().toISOString()).toBe(BOOT.toISOString());
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain(`?schedule=${value}`);
      expect(message).toContain("2025");
    },
  );

  it.each([
    "lastTuesday",
    "2025-10-24",
    "2025-10-24T20:30:00Z",
    "2025-02-30T10:00",
    "2025-10-24T24:00",
    "2025-03-30T02:30",
    "9999-12-31T23:30",
  ])(
    "?now=%s warns, naming the value and the accepted form, and boots on the real clock",
    async (value) => {
      const { schedule, now } = await applyDebugParams(url(`?now=${value}`), PRODUCTION);
      expect(schedule).toBe(PRODUCTION);
      expect(now().toISOString()).toBe(BOOT.toISOString());
      expect(warn).toHaveBeenCalledTimes(1);
      const message = String(warn.mock.calls[0]?.[0]);
      expect(message).toContain(`?now=${value}`);
      expect(message).toContain("YYYY-MM-DDTHH:MM");
    },
  );

  it("never throws, and a bad ?now= still leaves a good ?schedule= on its default clock", async () => {
    const { schedule, now } = await applyDebugParams(
      url("?schedule=2025&now=lastTuesday"),
      PRODUCTION,
    );
    expect(schedule.days[0]?.date).toBe("2025-10-24");
    expect(now().toISOString()).toBe(FRI_2030_OSLO);
    expect(warn).toHaveBeenCalledTimes(1);
  });
});

describe("outside a dev build", () => {
  it("ignores both params: production Schedule, real clock, not a word", async () => {
    vi.stubEnv("DEV", false);
    const { schedule, now } = await applyDebugParams(
      url("?schedule=2025&now=2025-10-24T20:30"),
      PRODUCTION,
    );
    expect(schedule).toBe(PRODUCTION);
    expect(now().toISOString()).toBe(BOOT.toISOString());
    expect(warn).not.toHaveBeenCalled();
  });
});
