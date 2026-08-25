// Favourites (ADR-0019, ported by reference): per-user stars on Acts,
// client-side only. Keyed by the act `id` — Broadcast's `objectId` carried
// verbatim in schedule.json (ADR-0024) — never an array index, so a Reveal
// refresh (time shifts, Stage moves, cancellations) can't mis-attribute a
// star. Re-namespaced off Øyablikk's `oya.` key.

const STORAGE_KEY = "fuzztid.favourites";

/**
 * Loads the starred set, silently dropping ids absent from the current
 * Schedule — stale entries self-heal across refreshes. The pruned set is
 * written straight back, so a dropped id cannot resurrect if a future
 * Schedule reuses it.
 */
export function loadFavourites(validActIds: ReadonlySet<string>): Set<string> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === null) return new Set();
  const favourites = parse(raw, validActIds);
  saveFavourites(favourites);
  return favourites;
}

function parse(raw: string, validActIds: ReadonlySet<string>): Set<string> {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((id) => typeof id === "string")) {
      return new Set(parsed.filter((id) => validActIds.has(id)));
    }
  } catch {
    // fall through to nothing starred
  }
  return new Set();
}

export function saveFavourites(favourites: ReadonlySet<string>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favourites]));
}

/** Flips one star and persists — the whole tap gesture ends here (ADR-0019). */
export function toggleFavourite(favourites: Set<string>, actId: string): void {
  if (favourites.has(actId)) {
    favourites.delete(actId);
  } else {
    favourites.add(actId);
  }
  saveFavourites(favourites);
}
