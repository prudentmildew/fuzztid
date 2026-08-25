// Builds one Day's pane: a column per Stage, an Act block per Act. Colour
// never crosses the outer seam (ADR-0024 §1–2) and Stage colour is cut
// outright (ADR-0025), so a column carries only position — the Stage row
// above it is the permanent label.

import { heartSvg } from "./icons.ts";
import { pxFromMin, type TimeOrigin } from "./layout.ts";
import type { Day, Stage } from "./schedule.ts";

export type RenderDayOptions = {
  day: Day;
  stages: Stage[];
  origin: TimeOrigin;
  pxPerMinute: number;
  /** Starred act ids (ADR-0019, ported by reference). Omitted = nothing starred. */
  favourites?: ReadonlySet<string>;
};

export function renderDay(opts: RenderDayOptions): HTMLElement {
  const { day, stages, origin, pxPerMinute, favourites } = opts;
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

      // Starred = highlighted in place (ADR-0019): filled heart + louder
      // block. The outlined heart rides every act as the standing hint that
      // the block is tappable — the grid gives no other sign (ADR-0021).
      const starred = favourites?.has(act.id) === true;
      if (starred) actEl.classList.add("starred");
      const heart = document.createElement("span");
      heart.className = "act-heart";
      heart.innerHTML = heartSvg(starred);
      actEl.appendChild(heart);

      colEl.appendChild(actEl);
    }

    columns.appendChild(colEl);
  }

  section.appendChild(columns);
  return section;
}
