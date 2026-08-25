// The primary app seam (#22 onward): a Schedule in, the grid on screen. This
// slice adds the Now line, the injected clock, Day standing and launch (#23).
// #24 adds the active-Day feed and `showDay` the switcher drives; Favourites
// and `onActTap` land in #25.

import { renderDay } from "./day-pane.ts";
import { pxFromMin, sharedOrigin } from "./layout.ts";
import { dayStanding, osloMinutes, type ScheduleStanding, todayFestivalDate } from "./now.ts";
import type { Day, Schedule } from "./schedule.ts";

const PX_PER_MINUTE = 2;

export type ScheduleViewOptions = {
  container: HTMLElement;
  schedule: Schedule;
  /** Injected rather than ambient (#23): a test pins time by argument. */
  now: () => Date;
  /** Fed the active pane's Day plus which date (if any) is today, so the switcher can mark its tab. */
  onActiveDayChange?: (day: Day, today: string | null) => void;
};

export type ScheduleView = {
  render(): void;
  /** Repositions the Now line and re-derives standing — the minute tick must not rebuild panes. */
  tick(at: Date): void;
  /** Horizontal-only, animated — never re-scrolls to now (ADR-0008, unqualified per #5). */
  showDay(date: string): void;
};

export function createScheduleView(opts: ScheduleViewOptions): ScheduleView {
  const { container, schedule, now, onActiveDayChange } = opts;
  container.classList.add("schedule");
  container.style.setProperty("--column-count", String(schedule.stages.length));

  const origin = sharedOrigin(schedule);
  const festivalDates = schedule.days.map((d) => d.date);

  // Persistent chrome (ADR-0012, ported by reference): built once, the Stage
  // row never moves under a Day change.
  const stageRow = document.createElement("div");
  stageRow.className = "stage-row";
  for (const stage of schedule.stages) {
    const label = document.createElement("div");
    label.className = "stage-label";
    label.dataset.stageId = stage.id;
    label.textContent = stage.name;
    stageRow.appendChild(label);
  }

  const daysEl = document.createElement("div");
  daysEl.className = "days";

  container.append(stageRow, daysEl);

  // Built once and repositioned, never rebuilt: the standing fade (ADR-0022,
  // ported by reference) lives on .now-line, and re-creating the node every
  // 60 s tick would replay it on the minute.
  let nowLine: HTMLElement | null = null;
  let nowPill: HTMLElement | null = null;

  function renderNow(nowMin: number | null): void {
    if (nowMin === null) {
      nowLine?.remove();
      nowPill?.remove();
      nowLine = null;
      nowPill = null;
      return;
    }

    if (!nowLine || !nowPill) {
      const line = document.createElement("div");
      line.className = "now-line";
      const pill = document.createElement("div");
      pill.className = "now-pill";
      pill.textContent = "NOW";
      container.append(line, pill);
      nowLine = line;
      nowPill = pill;
    }

    const top = `${pxFromMin(nowMin, origin, PX_PER_MINUTE)}px`;
    nowLine.style.top = top;
    nowPill.style.top = top;
  }

  function activeDayDate(): string | undefined {
    const width = daysEl.clientWidth;
    const idx =
      width > 0
        ? Math.max(0, Math.min(Math.round(daysEl.scrollLeft / width), schedule.days.length - 1))
        : 0;
    return schedule.days[idx]?.date;
  }

  function paneStanding(dayDate: string | undefined, at: Date): ScheduleStanding {
    if (dayDate === undefined) return "none";
    if (todayFestivalDate(festivalDates, at) === null) return "none";
    return dayStanding(dayDate, at);
  }

  // The Festival's daily envelope (CONTEXT.md's "Now line" entry) is the one
  // shared `origin` both Days already scroll against (#22) — not a per-Day
  // start/end, which the two Høstsabbat Days share anyway.
  function nowMinInEnvelope(at: Date): number | null {
    const minutes = osloMinutes(at);
    return minutes >= origin.startMin && minutes <= origin.endMin ? minutes : null;
  }

  function updateNow(at: Date): void {
    renderNow(nowMinInEnvelope(at));
    container.dataset.nowStanding = paneStanding(activeDayDate(), at);
  }

  // Never fires at zero width, when activeDayDate()'s width-less fallback to
  // index 0 would misreport the active Day to the switcher.
  function notifyActiveDayChange(at: Date): void {
    if (!onActiveDayChange) return;
    if (daysEl.clientWidth === 0) return;
    const date = activeDayDate();
    const day = schedule.days.find((d) => d.date === date);
    if (!day) return;
    onActiveDayChange(day, todayFestivalDate(festivalDates, at));
  }

  // Flips true once the launch jump has run (successfully or via its
  // zero-width retry). A re-render afterwards preserves the pane in view
  // instead of jumping again.
  let launched = false;

  function jumpToLaunchPane(): void {
    const width = daysEl.clientWidth;
    if (width === 0) {
      requestAnimationFrame(jumpToLaunchPane);
      return;
    }
    launched = true;

    const at = now();
    const launchDate = todayFestivalDate(festivalDates, at) ?? schedule.days[0]?.date;
    const idx = launchDate ? schedule.days.findIndex((d) => d.date === launchDate) : -1;
    daysEl.scrollLeft = Math.max(0, idx) * width;

    const nowMin = nowMinInEnvelope(at);
    if (nowMin !== null) {
      const nowTopPx = pxFromMin(nowMin, origin, PX_PER_MINUTE);
      container.scrollTop = Math.max(0, nowTopPx - container.clientHeight / 2);
    }
    // The Now line itself is width-independent — render()'s own updateNow()
    // call already positions it, so this jump only owns the scroll.
    notifyActiveDayChange(at);
  }

  function render(): void {
    // Panes are replaced, not accumulated — preserve whichever Day is in
    // view across the rebuild rather than snapping back to the first.
    const width = daysEl.clientWidth;
    const activeIdx = width > 0 ? Math.round(daysEl.scrollLeft / width) : 0;

    daysEl.replaceChildren();
    for (const day of schedule.days) {
      daysEl.appendChild(
        renderDay({ day, stages: schedule.stages, origin, pxPerMinute: PX_PER_MINUTE }),
      );
    }

    if (!launched) {
      // One instant internal jump (#23) — no width yet retries on the next
      // frame. This only owns scroll position; the Now line below is
      // width-independent and always current regardless of when it lands.
      jumpToLaunchPane();
    } else if (width > 0) {
      daysEl.scrollLeft = activeIdx * width;
      notifyActiveDayChange(now());
    }

    updateNow(now());
  }

  function tick(at: Date): void {
    updateNow(at);
    // A calendar fact, not just a swipe-driven one — which Day is "today"
    // can flip under an Oslo midnight while the pane stays parked.
    notifyActiveDayChange(at);
  }

  function showDay(date: string): void {
    const idx = schedule.days.findIndex((d) => d.date === date);
    if (idx === -1) return;
    const width = daysEl.clientWidth;
    daysEl.scrollTo({ left: idx * width, behavior: "smooth" });
  }

  // Standing is a calendar fact that can also change with a bare swipe — an
  // Oslo midnight aside, flipping panes flips which Day is "today" (ADR-0022).
  daysEl.addEventListener(
    "scroll",
    () => {
      const at = now();
      container.dataset.nowStanding = paneStanding(activeDayDate(), at);
      notifyActiveDayChange(at);
    },
    { passive: true },
  );

  return { render, tick, showDay };
}
