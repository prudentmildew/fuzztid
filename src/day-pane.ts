// Builds one Day's pane: a column per Stage, an Act block per Act. Colour
// never crosses the outer seam (ADR-0024 §1–2) and Stage colour is cut
// outright (ADR-0025), so a column carries only position — the Stage row
// above it is the permanent label.

import { pxFromMin, type TimeOrigin } from "./layout.ts";
import type { Day, Stage } from "./schedule.ts";

export type RenderDayOptions = {
  day: Day;
  stages: Stage[];
  origin: TimeOrigin;
  pxPerMinute: number;
};

export function renderDay(opts: RenderDayOptions): HTMLElement {
  const { day, stages, origin, pxPerMinute } = opts;
  const section = document.createElement("section");
  section.className = "day";
  section.dataset.dayDate = day.date;

  const columns = document.createElement("div");
  columns.className = "columns";

  const heightPx = (origin.endMin - origin.startMin) * pxPerMinute;

  for (const stage of stages) {
    const colEl = document.createElement("div");
    colEl.className = "column";
    colEl.dataset.stageId = stage.id;
    colEl.style.height = `${heightPx}px`;

    for (const act of day.acts[stage.id] ?? []) {
      const actEl = document.createElement("div");
      actEl.className = "act";
      // Stable act identity — the hook Favourites will key on (#25).
      actEl.dataset.actId = act.id;
      actEl.style.top = `${pxFromMin(act.start_min, origin, pxPerMinute)}px`;
      actEl.style.height = `${(act.end_min - act.start_min) * pxPerMinute}px`;

      const start = document.createElement("span");
      start.className = "act-start";
      start.textContent = act.start;
      const name = document.createElement("span");
      name.className = "act-name";
      name.textContent = act.name;
      const end = document.createElement("span");
      end.className = "act-end";
      end.textContent = act.end;
      actEl.append(start, name, end);

      colEl.appendChild(actEl);
    }

    columns.appendChild(colEl);
  }

  section.appendChild(columns);
  return section;
}
