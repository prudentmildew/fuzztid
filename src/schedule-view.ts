// The primary app seam (#22 onward): a Schedule in, the grid on screen. This
// slice renders the static Stage row and one pane per Day — the Now line,
// the injected clock, launch and the Day switcher land in #23/#24, Favourites
// and Focus in #25.

import { renderDay } from "./day-pane.ts";
import { sharedOrigin } from "./layout.ts";
import type { Schedule } from "./schedule.ts";

const PX_PER_MINUTE = 2;

export type ScheduleViewOptions = {
  container: HTMLElement;
  schedule: Schedule;
};

export type ScheduleView = {
  render(): void;
};

export function createScheduleView(opts: ScheduleViewOptions): ScheduleView {
  const { container, schedule } = opts;
  container.classList.add("schedule");
  container.style.setProperty("--column-count", String(schedule.stages.length));

  const origin = sharedOrigin(schedule);

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

    if (width > 0) {
      daysEl.scrollLeft = activeIdx * width;
    }
  }

  return { render };
}
