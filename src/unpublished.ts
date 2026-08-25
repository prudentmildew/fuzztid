// The pre-Reveal screen (ADR-0028 §5–9): what most visitors see for the two
// months before the Reveal. Its own module, mounted instead of the full app
// — main.ts branches on isPublished before it ever builds a ScheduleView, a
// time origin or a Day switcher. No Day tabs (no Days to move between yet)
// and no Focus heart (nothing to dim) — the Header carries only the
// wordmark and the ⓘ on this branch.

import type { EditionConfig } from "../scripts/edition-config.ts";

const VENUE = "Kulturkirken Jakob, Oslo";
const LINEUP_URL = "https://www.hostsabbat.no/";

export function createUnpublishedScreen(config: EditionConfig): HTMLElement {
  const screen = document.createElement("main");
  screen.className = "unpublished";

  const dates = document.createElement("p");
  dates.className = "unpublished-dates";
  dates.textContent = `${formatDateRange(config.days)}, ${VENUE}`;
  screen.appendChild(dates);

  const note = document.createElement("p");
  note.className = "unpublished-note";
  note.textContent = "The programme is published a few days beforehand.";
  screen.appendChild(note);

  const link = document.createElement("a");
  link.className = "unpublished-link";
  link.href = LINEUP_URL;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = "See the lineup at hostsabbat.no";
  screen.appendChild(link);

  return screen;
}

/** "23–24 October 2026" for a same-month range; spells out both months otherwise. */
function formatDateRange(days: readonly string[]): string {
  const first = days[0];
  const last = days.at(-1);
  if (first === undefined || last === undefined) {
    throw new Error("EditionConfig.days is empty — there is no range to show.");
  }

  const firstDate = new Date(`${first}T12:00:00Z`);
  const lastDate = new Date(`${last}T12:00:00Z`);
  const day = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", timeZone: "UTC" });
  const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  const year = (d: Date) => d.toLocaleDateString("en-GB", { year: "numeric", timeZone: "UTC" });

  if (month(firstDate) === month(lastDate) && year(firstDate) === year(lastDate)) {
    return `${day(firstDate)}–${day(lastDate)} ${month(lastDate)} ${year(lastDate)}`;
  }
  return `${day(firstDate)} ${month(firstDate)} – ${day(lastDate)} ${month(lastDate)} ${year(lastDate)}`;
}
