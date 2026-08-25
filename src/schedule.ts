// The canonical schedule shape (ADR-0024 §1–§2): the on-disk
// data/schedule.json matches these types 1:1, so the app needs no hydration
// step. Colour never crosses this seam — CSS owns what a Stage looks like,
// the pipeline only owns which Stages exist and in what order.

export type Stage = {
  id: string;
  name: string;
};

export type Act = {
  /** Stable act identity: Broadcast's `objectId`, verbatim. */
  id: string;
  name: string;
  /** "HH:MM" Oslo wall-clock time. */
  start: string;
  end: string;
  start_min: number;
  end_min: number;
};

export type Day = {
  /** ISO date, e.g. "2026-10-23". */
  date: string;
  /** Envelope of the day's programme, minutes since midnight. */
  start_min: number;
  end_min: number;
  /** Acts per stage id. Every configured stage is present, possibly empty. */
  acts: Record<string, Act[]>;
};

export type Schedule = {
  stages: Stage[];
  days: Day[];
};

// A Schedule is published iff it carries at least one Act (ADR-0028 §5–§9).
// This is the app-side predicate, over the assembled Schedule; the
// source-shape published predicate in scripts/broadcast.ts checks different
// input for a different reason and the two are deliberately not shared.
export function isPublished(schedule: Schedule): boolean {
  return schedule.days.some((day) => Object.values(day.acts).some((acts) => acts.length > 0));
}

// The Edition is a property of the Schedule, never a field on it (ADR-0024
// §2): whatever the app scopes per Edition — the Favourites key today (#29),
// the pre-Reveal line next (#31) — derives the year from the first Day here,
// inside src/.
export function editionYear(schedule: Schedule): string {
  const first = schedule.days[0]?.date;
  if (first === undefined) {
    throw new Error("The Schedule has no Days — there is no Edition to derive.");
  }
  return first.slice(0, 4);
}
