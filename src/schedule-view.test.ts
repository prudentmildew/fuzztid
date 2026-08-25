import { beforeEach, describe, expect, it } from "vitest";
import type { Act, Day, Schedule, Stage } from "./schedule.ts";
import { createScheduleView } from "./schedule-view.ts";

const stages: Stage[] = [
  { id: "the-chapel", name: "The Chapel" },
  { id: "the-crypt", name: "The Crypt" },
];

function makeDay(
  date: string,
  acts: Record<string, Act[]> = { "the-chapel": [], "the-crypt": [] },
): Day {
  return { date, start_min: 600, end_min: 660, acts };
}

const schedule: Schedule = {
  stages,
  days: [makeDay("2026-10-23"), makeDay("2026-10-24")],
};

let container: HTMLElement;

// happy-dom lays nothing out — a test touching panes or scroll must fake
// clientWidth and drive scrollLeft by hand, or it silently asserts nothing.
function widen(el: HTMLElement, w: number): void {
  Object.defineProperty(el, "clientWidth", { value: w, configurable: true });
}

beforeEach(() => {
  container = document.createElement("section");
  document.body.appendChild(container);
});

function daysEl(): HTMLElement {
  const el = container.querySelector(".days");
  if (!el) throw new Error(".days not found");
  return el as HTMLElement;
}

describe("ScheduleView.render", () => {
  it("builds a static stage row with one label per stage", () => {
    createScheduleView({ container, schedule }).render();
    const labels = container.querySelectorAll(".stage-row .stage-label");
    expect(labels.length).toBe(2);
    expect((labels[0] as HTMLElement).textContent).toBe("The Chapel");
    expect((labels[1] as HTMLElement).textContent).toBe("The Crypt");
  });

  it("mounts one pane per day in the data", () => {
    createScheduleView({ container, schedule }).render();
    expect(daysEl().children.length).toBe(2);
  });

  it("follows the data when the day count changes (no hardcoded pane count)", () => {
    const threeDaySchedule: Schedule = {
      stages,
      days: [makeDay("2026-10-23"), makeDay("2026-10-24"), makeDay("2026-10-25")],
    };
    createScheduleView({ container, schedule: threeDaySchedule }).render();
    expect(daysEl().children.length).toBe(3);
  });

  it("renders an act block with times, name, position, height and its stable id", () => {
    const act: Act = {
      id: "sanity-id-1",
      name: "Kanaan & Ævestaden",
      start: "17:30",
      end: "18:00",
      start_min: 630,
      end_min: 660,
    };
    const oneDay: Schedule = {
      stages,
      days: [makeDay("2026-10-23", { "the-chapel": [act], "the-crypt": [] })],
    };
    createScheduleView({ container, schedule: oneDay }).render();

    const actEl = container.querySelector(".act") as HTMLElement;
    expect(actEl.dataset.actId).toBe("sanity-id-1");
    // 630 is 30 min past the 600 origin at 2 px/min.
    expect(actEl.style.top).toBe("60px");
    expect(actEl.style.height).toBe("60px");
    expect((actEl.querySelector(".act-start") as HTMLElement).textContent).toBe("17:30");
    expect((actEl.querySelector(".act-name") as HTMLElement).textContent).toBe(
      "Kanaan & Ævestaden",
    );
    expect((actEl.querySelector(".act-end") as HTMLElement).textContent).toBe("18:00");
  });

  it("replaces panes on re-render (does not accumulate)", () => {
    const view = createScheduleView({ container, schedule });
    view.render();
    view.render();
    expect(daysEl().children.length).toBe(2);
  });

  it("preserves the pane in view across a re-render", () => {
    const view = createScheduleView({ container, schedule });
    view.render();
    widen(daysEl(), 320);
    daysEl().scrollLeft = 320; // parked on the second pane

    view.render();

    expect(daysEl().scrollLeft).toBe(320);
  });
});
