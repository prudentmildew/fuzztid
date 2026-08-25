import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

// A fixed instant, injected — every time-dependent test pins time by
// argument rather than faking the system clock (#23).
function fixedNow(iso: string): () => Date {
  return () => new Date(iso);
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
    createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") }).render();
    const labels = container.querySelectorAll(".stage-row .stage-label");
    expect(labels.length).toBe(2);
    expect((labels[0] as HTMLElement).textContent).toBe("The Chapel");
    expect((labels[1] as HTMLElement).textContent).toBe("The Crypt");
  });

  it("mounts one pane per day in the data", () => {
    createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") }).render();
    expect(daysEl().children.length).toBe(2);
  });

  it("follows the data when the day count changes (no hardcoded pane count)", () => {
    const threeDaySchedule: Schedule = {
      stages,
      days: [makeDay("2026-10-23"), makeDay("2026-10-24"), makeDay("2026-10-25")],
    };
    createScheduleView({
      container,
      schedule: threeDaySchedule,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render();
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
    createScheduleView({
      container,
      schedule: oneDay,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render();

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
    const view = createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") });
    view.render();
    view.render();
    expect(daysEl().children.length).toBe(2);
  });

  it("preserves the pane in view across a re-render", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") });
    widen(daysEl(), 320);
    view.render(); // launches onto the first pane, at width 320
    daysEl().scrollLeft = 320; // parked on the second pane

    view.render();

    expect(daysEl().scrollLeft).toBe(320);
  });

  it("marks a starred act with the glyph and the louder class; others untouched", () => {
    const starred: Act = {
      id: "sanity-id-1",
      name: "Starred",
      start: "10:00",
      end: "10:30",
      start_min: 600,
      end_min: 630,
    };
    const plain: Act = {
      id: "sanity-id-2",
      name: "Plain",
      start: "10:30",
      end: "11:00",
      start_min: 630,
      end_min: 660,
    };
    const oneDay: Schedule = {
      stages,
      days: [makeDay("2026-10-23", { "the-chapel": [starred, plain], "the-crypt": [] })],
    };
    createScheduleView({
      container,
      schedule: oneDay,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render({
      favourites: new Set(["sanity-id-1"]),
    });

    // Every act wears the heart (ADR-0021); starring fills it in place.
    const starredEl = container.querySelector('[data-act-id="sanity-id-1"]') as HTMLElement;
    expect(starredEl.classList.contains("starred")).toBe(true);
    expect(starredEl.querySelector(".act-heart svg")?.getAttribute("fill")).toBe("currentColor");

    const plainEl = container.querySelector('[data-act-id="sanity-id-2"]') as HTMLElement;
    expect(plainEl.classList.contains("starred")).toBe(false);
    expect(plainEl.querySelector(".act-heart svg")?.getAttribute("fill")).toBe("none");
  });

  it("keeps a star on its act id when a refresh moves the act to a different time and Stage", () => {
    const act = (over: Partial<Act>): Act => ({
      id: "moving-act",
      name: "Mover",
      start: "10:00",
      end: "10:30",
      start_min: 600,
      end_min: 630,
      ...over,
    });
    const bystander = act({ id: "bystander", name: "Bystander" });
    const favourites = new Set(["moving-act"]);

    const before: Schedule = {
      stages,
      days: [makeDay("2026-10-23", { "the-chapel": [act({})], "the-crypt": [bystander] })],
    };
    createScheduleView({
      container,
      schedule: before,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render({
      favourites,
    });
    let starredEls = container.querySelectorAll(".act.starred");
    expect(starredEls.length).toBe(1);
    expect((starredEls[0] as HTMLElement).dataset.actId).toBe("moving-act");

    const after: Schedule = {
      stages,
      days: [
        makeDay("2026-10-23", {
          "the-chapel": [bystander],
          "the-crypt": [act({ start: "10:30", end: "11:00", start_min: 630, end_min: 660 })],
        }),
      ],
    };
    container.replaceChildren();
    createScheduleView({
      container,
      schedule: after,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render({
      favourites,
    });
    starredEls = container.querySelectorAll(".act.starred");
    expect(starredEls.length).toBe(1);
    expect((starredEls[0] as HTMLElement).dataset.actId).toBe("moving-act");
  });
});

describe("ScheduleView.onActTap (tap-vs-scroll discipline, ADR-0019)", () => {
  const act: Act = {
    id: "tappable-act",
    name: "Tappable",
    start: "10:00",
    end: "10:30",
    start_min: 600,
    end_min: 630,
  };
  const oneDay: Schedule = {
    stages,
    days: [makeDay("2026-10-23", { "the-chapel": [act], "the-crypt": [] })],
  };

  function makeTapView(onActTap: (id: string) => void) {
    const view = createScheduleView({
      container,
      schedule: oneDay,
      now: fixedNow("2026-10-23T08:30:00Z"),
      onActTap,
    });
    view.render();
    return container.querySelector(".act") as HTMLElement;
  }

  function pointer(el: HTMLElement, type: string, x: number, y: number): void {
    el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, bubbles: true }));
  }

  it("fires with the act id on a clean tap", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerdown", 50, 100);
    pointer(actEl, "pointerup", 50, 100);
    expect(onActTap).toHaveBeenCalledTimes(1);
    expect(onActTap).toHaveBeenCalledWith("tappable-act");
  });

  it("tolerates sub-slop jitter — a finger is not a stylus", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerdown", 50, 100);
    pointer(actEl, "pointerup", 53, 96);
    expect(onActTap).toHaveBeenCalledTimes(1);
  });

  it("does not fire when the pointer travelled — that was a scroll", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerdown", 50, 100);
    pointer(actEl, "pointerup", 50, 180);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("does not fire after pointercancel — the browser took the gesture", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerdown", 50, 100);
    pointer(actEl, "pointercancel", 50, 100);
    pointer(actEl, "pointerup", 50, 100);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("does not fire on a pointerup with no preceding pointerdown", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerup", 50, 100);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("does not fire on a clean tap outside any act block", () => {
    const onActTap = vi.fn();
    makeTapView(onActTap);
    const column = container.querySelector(".column") as HTMLElement;
    pointer(column, "pointerdown", 10, 500);
    pointer(column, "pointerup", 10, 500);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("does not fire on a zero-travel tap that arrests a momentum scroll", () => {
    // A fling is still emitting scroll events when the finger lands to stop
    // it — that touch is spent on stopping, not starring (ADR-0019).
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    container.dispatchEvent(new Event("scroll"));
    pointer(actEl, "pointerdown", 50, 100);
    pointer(actEl, "pointerup", 50, 100);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("cancels the gesture when the pane scrolls between down and up", () => {
    const onActTap = vi.fn();
    const actEl = makeTapView(onActTap);
    pointer(actEl, "pointerdown", 50, 100);
    daysEl().dispatchEvent(new Event("scroll"));
    pointer(actEl, "pointerup", 50, 100);
    expect(onActTap).not.toHaveBeenCalled();
  });

  it("attributes the tap to the act under the finger at pointerdown", () => {
    // A ≤slop wobble can end on the adjacent block; the act the finger
    // landed on is the one the user meant.
    const neighbour: Act = {
      id: "neighbour-act",
      name: "Neighbour",
      start: "10:30",
      end: "11:00",
      start_min: 630,
      end_min: 660,
    };
    const twoActs: Schedule = {
      stages,
      days: [makeDay("2026-10-23", { "the-chapel": [act, neighbour], "the-crypt": [] })],
    };
    const onActTap = vi.fn();
    const view = createScheduleView({
      container,
      schedule: twoActs,
      now: fixedNow("2026-10-23T08:30:00Z"),
      onActTap,
    });
    view.render();

    const downEl = container.querySelector('[data-act-id="tappable-act"]') as HTMLElement;
    const upEl = container.querySelector('[data-act-id="neighbour-act"]') as HTMLElement;
    pointer(downEl, "pointerdown", 50, 100);
    pointer(upEl, "pointerup", 50, 106);
    expect(onActTap).toHaveBeenCalledTimes(1);
    expect(onActTap).toHaveBeenCalledWith("tappable-act");
  });
});

describe("ScheduleView — the Now line", () => {
  // Oslo 10:30 on 23 Oct 2026 = UTC 08:30 (CEST, UTC+2) — inside the 600-660
  // (10:00-11:00) envelope shared by both fixture Days.
  const insideEnvelope = "2026-10-23T08:30:00Z";
  // Oslo 09:00 the same day — before the envelope opens.
  const outsideEnvelope = "2026-10-23T07:00:00Z";

  it("is absent outside the Day's envelope", () => {
    createScheduleView({ container, schedule, now: fixedNow(outsideEnvelope) }).render();
    expect(container.querySelector(".now-line")).toBeNull();
    expect(container.querySelector(".now-pill")).toBeNull();
  });

  it("is present and positioned by minutes-since-origin when inside the envelope", () => {
    createScheduleView({ container, schedule, now: fixedNow(insideEnvelope) }).render();
    const line = container.querySelector(".now-line") as HTMLElement;
    expect(line).not.toBeNull();
    // 630 is 30 min past the 600 origin at 2 px/min.
    expect(line.style.top).toBe("60px");
  });

  it("is a single element that is repositioned, never rebuilt, on tick", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow(insideEnvelope) });
    view.render();
    const line = container.querySelector(".now-line") as HTMLElement;

    // 10:45 Oslo = UTC 08:45 CEST — still inside the envelope, 15 min later.
    view.tick(new Date("2026-10-23T08:45:00Z"));

    expect(container.querySelectorAll(".now-line").length).toBe(1);
    expect(container.querySelector(".now-line")).toBe(line);
    expect(line.style.top).toBe("90px");
  });

  it("is removed once the tick carries time outside the envelope, and rebuilt on return", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow(insideEnvelope) });
    view.render();

    view.tick(new Date(outsideEnvelope));
    expect(container.querySelector(".now-line")).toBeNull();

    view.tick(new Date(insideEnvelope));
    expect(container.querySelector(".now-line")).not.toBeNull();
  });

  it("does not rebuild the day panes on tick", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow(insideEnvelope) });
    view.render();
    const firstPane = daysEl().children[0];

    view.tick(new Date("2026-10-23T08:45:00Z"));

    expect(daysEl().children[0]).toBe(firstPane);
  });
});

describe("ScheduleView — Day standing on the container", () => {
  it("publishes 'today' when the active pane's date is the Oslo date", () => {
    createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"),
    }).render();
    expect(container.dataset.nowStanding).toBe("today");
  });

  it("publishes 'past' for a pane before today and 'future' for one after", () => {
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-24T08:30:00Z"), // today (Oslo) is the second Day
    });
    widen(daysEl(), 320);
    view.render(); // launches onto today (the second Day, idx 1)

    daysEl().scrollLeft = 0; // swipe back to the first Day, now in the past
    daysEl().dispatchEvent(new Event("scroll"));
    expect(container.dataset.nowStanding).toBe("past");

    daysEl().scrollLeft = 320; // swipe forward again
    daysEl().dispatchEvent(new Event("scroll"));
    expect(container.dataset.nowStanding).toBe("today");
  });

  it("publishes 'future' for a pane after today", () => {
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"), // today (Oslo) is the first Day
    });
    widen(daysEl(), 320);
    view.render(); // launches onto today (the first Day, idx 0)

    daysEl().scrollLeft = 320; // swipe forward to the second Day, still to come
    daysEl().dispatchEvent(new Event("scroll"));
    expect(container.dataset.nowStanding).toBe("future");
  });

  it("publishes 'none' when no Day is today", () => {
    createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-08-01T08:30:00Z"), // months before the festival
    }).render();
    expect(container.dataset.nowStanding).toBe("none");
  });

  it("re-derives standing on tick, since it is a calendar fact that can change with no swipe", () => {
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"),
    });
    view.render();
    expect(container.dataset.nowStanding).toBe("today");

    // Oslo has crossed into 24 Oct while the app stayed parked on the 23rd.
    view.tick(new Date("2026-10-23T22:30:00Z"));
    expect(container.dataset.nowStanding).toBe("past");
  });
});

describe("ScheduleView — launch", () => {
  it("jumps straight to today's pane, in one instant internal scroll, when width is already known", () => {
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-24T08:30:00Z"), // today (Oslo) is the second Day
    });
    widen(daysEl(), 320);
    view.render();
    expect(daysEl().scrollLeft).toBe(320);
  });

  it("falls back to the first Day when no Day is today", () => {
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-08-01T08:30:00Z"),
    });
    widen(daysEl(), 320);
    view.render();
    expect(daysEl().scrollLeft).toBe(0);
  });

  describe("with a zero-width pane at launch", () => {
    let rafCallback: FrameRequestCallback | undefined;

    beforeEach(() => {
      rafCallback = undefined;
      vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
        rafCallback = cb;
        return 0;
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("retries the jump once the pane reports a width", () => {
      createScheduleView({
        container,
        schedule,
        now: fixedNow("2026-10-24T08:30:00Z"),
      }).render();

      expect(daysEl().scrollLeft).toBe(0);
      expect(rafCallback).toBeDefined();

      widen(daysEl(), 320);
      rafCallback?.(0);

      expect(daysEl().scrollLeft).toBe(320);
    });
  });
});

describe("ScheduleView — active-Day feed (#5's onActiveDayChange seam)", () => {
  it("fires once launch lands on a known width, with the launch Day and today's date", () => {
    const onActiveDayChange = vi.fn();
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-24T08:30:00Z"), // today (Oslo) is the second Day
      onActiveDayChange,
    });
    widen(daysEl(), 320);
    view.render();

    expect(onActiveDayChange).toHaveBeenCalledWith(schedule.days[1], "2026-10-24");
  });

  it("does not fire while the launch pane is still zero width", () => {
    const onActiveDayChange = vi.fn();
    let rafCallback: FrameRequestCallback | undefined;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCallback = cb;
      return 0;
    });

    createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-24T08:30:00Z"),
      onActiveDayChange,
    }).render();

    expect(onActiveDayChange).not.toHaveBeenCalled();

    widen(daysEl(), 320);
    rafCallback?.(0);
    expect(onActiveDayChange).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });

  it("follows a swipe-driven active-Day change", () => {
    const onActiveDayChange = vi.fn();
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"), // today (Oslo) is the first Day
      onActiveDayChange,
    });
    widen(daysEl(), 320);
    view.render();
    onActiveDayChange.mockClear();

    daysEl().scrollLeft = 320; // swipe forward to the second Day
    daysEl().dispatchEvent(new Event("scroll"));

    expect(onActiveDayChange).toHaveBeenCalledWith(schedule.days[1], "2026-10-23");
  });

  it("states both axes on the Saturday case: a Day can be active without being today", () => {
    const onActiveDayChange = vi.fn();
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"), // today (Oslo) is the first Day
      onActiveDayChange,
    });
    widen(daysEl(), 320);
    view.render();
    onActiveDayChange.mockClear();

    daysEl().scrollLeft = 320; // swipe forward to the second (non-today) Day
    daysEl().dispatchEvent(new Event("scroll"));

    const [day, today] = onActiveDayChange.mock.calls[0] ?? [];
    expect(day).toBe(schedule.days[1]);
    expect(today).toBe("2026-10-23");
  });

  it("re-derives today on tick, since it is a calendar fact that can change with no swipe", () => {
    const onActiveDayChange = vi.fn();
    const view = createScheduleView({
      container,
      schedule,
      now: fixedNow("2026-10-23T08:30:00Z"),
      onActiveDayChange,
    });
    widen(daysEl(), 320);
    view.render();
    onActiveDayChange.mockClear();

    // Oslo has crossed into 24 Oct while the app stayed parked on the 23rd.
    view.tick(new Date("2026-10-23T22:30:00Z"));

    expect(onActiveDayChange).toHaveBeenCalledWith(schedule.days[0], "2026-10-24");
  });
});

describe("ScheduleView.showDay", () => {
  it("scrolls the pane horizontally only, animated", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") });
    widen(daysEl(), 320);
    view.render();
    const scrollTo = vi.spyOn(daysEl(), "scrollTo");

    view.showDay("2026-10-24");

    expect(scrollTo).toHaveBeenCalledWith({ left: 320, behavior: "smooth" });
  });

  it("never re-scrolls to now — vertical scroll is untouched", () => {
    const view = createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") });
    widen(daysEl(), 320);
    view.render();
    container.scrollTop = 42;

    view.showDay("2026-10-24");

    expect(container.scrollTop).toBe(42);
  });
});

describe("hour ticks (#31, story 12)", () => {
  it("publishes the hour's height and the first tick's offset as custom properties on the container", () => {
    createScheduleView({ container, schedule, now: fixedNow("2026-10-23T08:30:00Z") });
    // 2 px/min: an hour is 120 px, and from a 10:00 origin the first tick is 11:00.
    expect(container.style.getPropertyValue("--hour-px")).toBe("120px");
    expect(container.style.getPropertyValue("--tick-offset")).toBe("120px");
  });

  it("lands the first tick on a whole hour whatever the origin's start", () => {
    const offset: Schedule = {
      stages,
      days: [
        { ...makeDay("2026-10-23"), start_min: 615, end_min: 1439 },
        { ...makeDay("2026-10-24"), start_min: 630, end_min: 1439 },
      ],
    };
    createScheduleView({ container, schedule: offset, now: fixedNow("2026-10-23T08:30:00Z") });
    // The shared origin starts 10:15; 11:00 is 45 min = 90 px down.
    expect(container.style.getPropertyValue("--tick-offset")).toBe("90px");
  });
});
