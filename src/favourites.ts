// Favourites (ADR-0019, ported by reference): per-user stars on Acts,
// client-side only. Keyed by the act `id` — Broadcast's `objectId` carried
// verbatim in schedule.json (ADR-0024) — never an array index, so a Reveal
// refresh (time shifts, Stage moves, cancellations) can't mis-attribute a
// star. Re-namespaced off Øyablikk's `oya.` key, and keyed per Edition (#29):
// CONTEXT.md scopes Favourites to one Edition and carries none across, and
// the self-heal below would otherwise wipe one year's stars on loading
// another's Schedule.

import { editionYear, type Schedule } from "./schedule.ts";

export type Favourites = {
  /** The starred act ids. Read by the view; mutated only through `toggle`. */
  readonly ids: ReadonlySet<string>;
  /** Flips one star and persists — the whole tap gesture ends here (ADR-0019). */
  toggle(actId: string): void;
};

function storageKey(schedule: Schedule): string {
  return `fuzztid.favourites.${editionYear(schedule)}`;
}

/**
 * Opens the Edition's starred set, silently dropping ids absent from the
 * current Schedule — stale entries self-heal across refreshes. The pruned
 * set is written straight back, so a dropped id cannot resurrect if a
 * future Schedule reuses it.
 */
export function loadFavourites(schedule: Schedule): Favourites {
  const key = storageKey(schedule);
  const validActIds = new Set(
    schedule.days.flatMap((day) => Object.values(day.acts).flat()).map((act) => act.id),
  );

  const ids = new Set<string>();
  const raw = localStorage.getItem(key);
  if (raw !== null) {
    for (const id of parse(raw)) if (validActIds.has(id)) ids.add(id);
    save(key, ids);
  }

  return {
    ids,
    toggle(actId) {
      if (ids.has(actId)) {
        ids.delete(actId);
      } else {
        ids.add(actId);
      }
      save(key, ids);
    },
  };
}

function parse(raw: string): string[] {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) return parsed;
  } catch {
    // fall through to nothing starred
  }
  return [];
}

function save(key: string, ids: ReadonlySet<string>): void {
  localStorage.setItem(key, JSON.stringify([...ids]));
}
