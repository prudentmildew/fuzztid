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

  it("builds no Day tabs and no Focus heart — there is nothing to switch between or dim", () => {
    const screen = createUnpublishedScreen(SCHEDULE);
    expect(screen.querySelector(".day-switcher")).toBeNull();
    expect(screen.querySelector(".app-focus-button")).toBeNull();
  });
});
