import { describe, expect, it } from "vitest";
import type { Schedule } from "./schedule.ts";
import { createUnpublishedScreen } from "./unpublished.ts";

function unpublishedSchedule(days: string[]): Schedule {
  return {
    stages: [{ id: "the-chapel", name: "The Chapel" }],
    days: days.map((date) => ({
      date,
      start_min: 0,
      end_min: 0,
      acts: { "the-chapel": [] },
    })),
  };
}

const SCHEDULE = unpublishedSchedule(["2026-10-23", "2026-10-24"]);

describe("createUnpublishedScreen", () => {
  it("shows the Edition's dates and venue", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    expect(screen.querySelector(".unpublished-dates")?.textContent).toBe(
      "23–24 October 2026, Kulturkirken Jakob, Oslo",
    );
  });

  it("shows a line saying the programme lands a few days beforehand", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    expect(screen.querySelector(".unpublished-note")?.textContent).toMatch(
      /published a few days beforehand/i,
    );
  });

  it("links to hostsabbat.no", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    const link = screen.querySelector<HTMLAnchorElement>(".unpublished-link");
    expect(link?.href).toBe("https://www.hostsabbat.no/");
  });

  it("spells out both months when the range crosses one", () => {
    const screen = createUnpublishedScreen(unpublishedSchedule(["2026-10-31", "2026-11-01"]));
    expect(screen.querySelector(".unpublished-dates")?.textContent).toBe(
      "31 October – 1 November 2026, Kulturkirken Jakob, Oslo",
    );
  });

  it("leads with which Festival and which Edition this is (#31, story 2)", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    const festival = screen.querySelector(".unpublished-festival");
    expect(festival?.textContent).toBe("Høstsabbat 2026");
    expect(screen.firstElementChild).toBe(festival);
  });

  it("derives the year from the first Day — the Edition rollover touches edition-config.ts alone", () => {
    const screen = createUnpublishedScreen(unpublishedSchedule(["2027-10-22", "2027-10-23"]));
    expect(screen.querySelector(".unpublished-festival")?.textContent).toBe("Høstsabbat 2027");
  });

  it("fails loud on a Schedule with no Days — there is no Edition to name", () => {
    expect(() => createUnpublishedScreen({ stages: [], days: [] })).toThrow(/no Days/);
  });

  it("makes no heading of it — the <h1> is the wordmark's (ADR-0026 §3)", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    expect(screen.querySelector("h1, h2, h3")).toBeNull();
  });

  it("builds no Day tabs and no Focus heart — there is nothing to switch between or dim", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    expect(screen.querySelector(".day-switcher")).toBeNull();
    expect(screen.querySelector(".app-focus-button")).toBeNull();
  });
});
