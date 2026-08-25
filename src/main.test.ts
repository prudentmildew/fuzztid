// Boot smoke test — the unpublished branch. main.ts has import side effects,
// so this needs its own module registry via a mocked data/schedule.json;
// the published branch isn't implemented yet (#22), so there is no second
// boot file here — src/main.ts throws if it's ever reached, which is
// covered directly, not through a boot import.
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
