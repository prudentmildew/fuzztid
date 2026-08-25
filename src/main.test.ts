// Boot smoke tests. main.ts has import side effects, so each branch needs
// its own module registry via a mocked data/schedule.json — vi.resetModules
// between them, since main.ts is only ever imported once per registry.
import { beforeAll, describe, expect, it, vi } from "vitest";
import type { Schedule } from "./schedule.ts";

const UNPUBLISHED_SCHEDULE: Schedule = {
  stages: [
    { id: "the-chapel", name: "The Chapel" },
    { id: "the-crypt", name: "The Crypt" },
    { id: "verkstedet", name: "Verkstedet" },
  ],
  days: [
    {
      date: "2026-10-23",
      start_min: 0,
      end_min: 0,
      acts: { "the-chapel": [], "the-crypt": [], verkstedet: [] },
    },
    {
      date: "2026-10-24",
      start_min: 0,
      end_min: 0,
      acts: { "the-chapel": [], "the-crypt": [], verkstedet: [] },
    },
  ],
};

vi.mock("../data/schedule.json", () => ({ default: UNPUBLISHED_SCHEDULE }));
vi.mock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));

beforeAll(async () => {
  const app = document.createElement("div");
  app.id = "app";
  document.body.appendChild(app);

  await import("./main.ts");
});

describe("app boot — unpublished Schedule", () => {
  it("mounts the wordmark and the ⓘ", () => {
    expect(document.querySelector(".app-wordmark")?.textContent).toBe("fuzztid");
    expect(document.querySelector(".app-info-button")).not.toBeNull();
  });

  it("builds no Day switcher and no Focus heart", () => {
    expect(document.querySelector(".day-switcher")).toBeNull();
    expect(document.querySelector(".app-focus-button")).toBeNull();
  });

  it("mounts the unpublished screen with the Edition's dates", () => {
    expect(document.querySelector(".unpublished-dates")?.textContent).toBe(
      "23–24 October 2026, Kulturkirken Jakob, Oslo",
    );
  });

  it("mounts the About sheet, closed, and opens it from the ⓘ", () => {
    const backdrop = document.querySelector<HTMLElement>(".sheet-backdrop");
    expect(backdrop?.hidden).toBe(true);
    document.querySelector<HTMLButtonElement>(".app-info-button")?.click();
    expect(backdrop?.hidden).toBe(false);
  });
});

describe("app boot — published Schedule", () => {
  const PUBLISHED_SCHEDULE: Schedule = {
    stages: [{ id: "the-chapel", name: "The Chapel" }],
    days: [
      {
        date: "2026-10-23",
        start_min: 600,
        end_min: 660,
        acts: {
          "the-chapel": [
            {
              id: "act-1",
              name: "Kanaan",
              start: "10:00",
              end: "11:00",
              start_min: 600,
              end_min: 660,
            },
          ],
        },
      },
      {
        date: "2026-10-24",
        start_min: 600,
        end_min: 660,
        acts: { "the-chapel": [] },
      },
    ],
  };

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock("../data/schedule.json", () => ({ default: PUBLISHED_SCHEDULE }));
    vi.doMock("virtual:pwa-register", () => ({ registerSW: vi.fn() }));

    document.body.innerHTML = "";
    const app = document.createElement("div");
    app.id = "app";
    document.body.appendChild(app);

    await import("./main.ts");
  });

  it("mounts the Stage row and the Act", () => {
    expect(document.querySelectorAll(".stage-label").length).toBe(1);
    expect(document.querySelector(".act-name")?.textContent).toBe("Kanaan");
  });

  it("mounts the wordmark alongside the Schedule", () => {
    expect(document.querySelector(".app-wordmark")?.textContent).toBe("fuzztid");
  });

  it("builds a Day switcher tab per Day, between the wordmark and the actions", () => {
    const tabs = document.querySelectorAll(".day-switcher-tab");
    expect(tabs.length).toBe(2);
    expect((tabs[0] as HTMLElement).querySelector(".day-switcher-label")?.textContent).toBe(
      "FRI 23",
    );
    expect((tabs[1] as HTMLElement).querySelector(".day-switcher-label")?.textContent).toBe(
      "SAT 24",
    );
  });

  it("moves the pane when a tab is tapped", () => {
    const daysEl = document.querySelector<HTMLElement>(".days") as HTMLElement;
    const scrollTo = vi.spyOn(daysEl, "scrollTo");
    const secondTab = document.querySelectorAll<HTMLButtonElement>(".day-switcher-tab")[1];
    secondTab?.click();
    expect(scrollTo).toHaveBeenCalled();
  });
});
