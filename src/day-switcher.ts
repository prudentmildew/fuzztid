// The Day switcher (ADR-0026): two plain buttons in the Header, not a
// `role="tablist"` — both panes are always in the DOM and scrollable, so a
// tabpanel contract would describe a pane structure that isn't there.
// Selected and today are independent axes, carried by two different means,
// because they genuinely are: on the Saturday of the festival, Friday's tab
// is the marked one and Saturday's is the selected one, and the switcher
// must be able to say both at once.

import type { Day } from "./schedule.ts";

export type DaySwitcherOptions = {
  days: Day[];
  onSelect: (date: string) => void;
};

export type DaySwitcher = {
  element: HTMLElement;
  /** Repaints which tab is selected and which (if any) is today. */
  update(activeDate: string, today: string | null): void;
};

const WEEKDAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

// Noon UTC sidesteps any DST edge in the date-to-weekday conversion — the
// ISO date is a calendar date, not an instant, so there is no Oslo offset to
// apply here.
function tabLabel(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return `${WEEKDAYS[d.getUTCDay()]} ${d.getUTCDate()}`;
}

export function createDaySwitcher(opts: DaySwitcherOptions): DaySwitcher {
  const { days, onSelect } = opts;

  const element = document.createElement("div");
  element.className = "day-switcher";

  const buttons = days.map((day) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-switcher-tab";
    button.dataset.date = day.date;
    button.setAttribute("aria-pressed", "false");

    // The dot's box is reserved under standing "none" (ADR-0026 §6): it
    // stays in the DOM and only its visibility toggles, so the Header's
    // geometry never shifts under an Oslo midnight.
    const dot = document.createElement("span");
    dot.className = "day-switcher-dot";
    dot.setAttribute("aria-hidden", "true");

    const label = document.createElement("span");
    label.className = "day-switcher-label";
    label.textContent = tabLabel(day.date);

    // The selected weight's box is reserved the same way the dot's is
    // (ADR-0026 §5, amended in #30): a hidden bold copy shares the label's
    // grid cell, so the tab is bold-wide at either weight and selecting it
    // moves nothing beside it.
    const reserve = document.createElement("span");
    reserve.className = "day-switcher-label-reserve";
    reserve.setAttribute("aria-hidden", "true");
    reserve.textContent = label.textContent;

    button.append(dot, label, reserve);
    button.addEventListener("click", () => onSelect(day.date));
    element.appendChild(button);
    return button;
  });

  function update(activeDate: string, today: string | null): void {
    for (const button of buttons) {
      const date = button.dataset.date;
      button.setAttribute("aria-pressed", String(date === activeDate));

      const isToday = date !== undefined && date === today;
      button.dataset.today = String(isToday);
      if (isToday) {
        button.setAttribute("aria-current", "date");
      } else {
        button.removeAttribute("aria-current");
      }
    }
  }

  return { element, update };
}
