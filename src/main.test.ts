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

  describe("Favourites and Focus (#25)", () => {
    function tap(el: HTMLElement): void {
      el.dispatchEvent(
        new PointerEvent("pointerdown", { clientX: 50, clientY: 100, bubbles: true }),
      );
      el.dispatchEvent(new PointerEvent("pointerup", { clientX: 50, clientY: 100, bubbles: true }));
    }

    const focusButton = () => document.querySelector(".app-focus-button") as HTMLButtonElement;
    const act = () => document.querySelector(".act") as HTMLElement;
    const daysEl = () => document.querySelector(".days") as HTMLElement;
    const scheduleEl = () => document.querySelector(".schedule") as HTMLElement;

    it("is inert with nothing starred", () => {
      expect(focusButton().disabled).toBe(true);
      expect(focusButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("stars an act on tap, and persists it", () => {
      tap(act());
      expect(act().classList.contains("starred")).toBe(true);
      expect(localStorage.getItem("fuzztid.favourites.2026")).toContain("act-1");
      expect(focusButton().disabled).toBe(false);
    });

    it("unstars on a second tap, and persists that too", () => {
      tap(act());
      expect(act().classList.contains("starred")).toBe(false);
      expect(JSON.parse(localStorage.getItem("fuzztid.favourites.2026") ?? "[]")).toEqual([]);
      expect(focusButton().disabled).toBe(true);
    });

    it("dims unstarred acts under Focus, and restores them when off", () => {
      tap(act()); // star the only act
      focusButton().click();
      expect(scheduleEl().classList.contains("focus")).toBe(true);
      expect(focusButton().getAttribute("aria-pressed")).toBe("true");

      focusButton().click();
      expect(scheduleEl().classList.contains("focus")).toBe(false);
      expect(focusButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("drops out of Focus when the last favourite is unstarred", () => {
      focusButton().click();
      expect(scheduleEl().classList.contains("focus")).toBe(true);

      tap(act()); // unstar the only favourite

      expect(scheduleEl().classList.contains("focus")).toBe(false);
      expect(focusButton().disabled).toBe(true);
      expect(focusButton().getAttribute("aria-pressed")).toBe("false");
    });

    it("does not star on a scroll", () => {
      daysEl().dispatchEvent(new Event("scroll"));
      tap(act());
      expect(act().classList.contains("starred")).toBe(false);
    });
  });
});
