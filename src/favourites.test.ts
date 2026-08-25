// Favourites persistence (ADR-0019, ported by reference): act ids —
// Broadcast's `objectId`s verbatim, never array indices — keyed per Edition
// under `fuzztid.favourites.<year>` (#29, CONTEXT.md's Edition entry: nothing
// carries across to the next). Stale ids self-heal on load.
import { beforeEach, describe, expect, it } from "vitest";
import { loadFavourites } from "./favourites.ts";
import type { Act, Schedule } from "./schedule.ts";

function act(id: string): Act {
  return { id, name: id, start: "20:00", end: "21:00", start_min: 1200, end_min: 1260 };
}

function scheduleWith(year: string, ids: string[]): Schedule {
  return {
    stages: [{ id: "the-chapel", name: "The Chapel" }],
    days: [
      {
        date: `${year}-10-23`,
        start_min: 1200,
        end_min: 1260,
        acts: { "the-chapel": ids.map(act) },
      },
    ],
  };
}

const SCHEDULE_2026 = scheduleWith("2026", ["act-1", "act-2", "act-3"]);
const KEY_2026 = "fuzztid.favourites.2026";

function stored(key: string): unknown {
  const raw = localStorage.getItem(key);
  return raw === null ? null : JSON.parse(raw);
}

beforeEach(() => {
  localStorage.clear();
});

describe("loadFavourites", () => {
  it("returns an empty set on fresh localStorage — nothing starred, nothing written", () => {
    expect(loadFavourites(SCHEDULE_2026).ids).toEqual(new Set());
    expect(localStorage.getItem(KEY_2026)).toBeNull();
  });

  it("keys the store per Edition, the year derived from the first Day", () => {
    loadFavourites(SCHEDULE_2026).toggle("act-1");
    expect(stored(KEY_2026)).toEqual(["act-1"]);
    expect(localStorage.getItem("fuzztid.favourites")).toBeNull();
  });

  it("round-trips a starred set", () => {
    const first = loadFavourites(SCHEDULE_2026);
    first.toggle("act-1");
    first.toggle("act-3");
    expect(loadFavourites(SCHEDULE_2026).ids).toEqual(new Set(["act-1", "act-3"]));
  });

  it("silently prunes a favourite whose act vanished from the Schedule", () => {
    localStorage.setItem(KEY_2026, JSON.stringify(["act-1", "act-2"]));
    // A Reveal refresh dropped act-2 from the Schedule.
    const refreshed = scheduleWith("2026", ["act-1", "act-3"]);
    expect(loadFavourites(refreshed).ids).toEqual(new Set(["act-1"]));
  });

  it("writes the pruned set back — a dropped id cannot resurrect later", () => {
    // If the pruned id ever reappears in a future Schedule, a stale star
    // must not spring back.
    localStorage.setItem(KEY_2026, JSON.stringify(["act-1", "act-2"]));
    loadFavourites(scheduleWith("2026", ["act-1"]));
    expect(stored(KEY_2026)).toEqual(["act-1"]);
  });

  it.each(["not json", '{"a":1}', "[1,2]"])(
    "falls back to nothing starred on a corrupt stored value (%s)",
    (raw) => {
      localStorage.setItem(KEY_2026, raw);
      expect(loadFavourites(SCHEDULE_2026).ids).toEqual(new Set());
    },
  );

  it("leaves another Edition's stars alone — the self-heal prunes only its own key", () => {
    // The exact defect #29 names: against one un-namespaced key, loading
    // the 2025 fixture would prune every 2026 star, and flipping back
    // would prune the 2025 ones.
    loadFavourites(SCHEDULE_2026).toggle("act-2");
    const store2025 = loadFavourites(scheduleWith("2025", ["yob-1", "yob-2"]));
    expect(store2025.ids).toEqual(new Set());
    store2025.toggle("yob-1");

    expect(stored(KEY_2026)).toEqual(["act-2"]);
    expect(stored("fuzztid.favourites.2025")).toEqual(["yob-1"]);
    expect(loadFavourites(SCHEDULE_2026).ids).toEqual(new Set(["act-2"]));
  });
});

describe("toggle", () => {
  it("stars, persists, unstars, persists", () => {
    const favourites = loadFavourites(SCHEDULE_2026);
    favourites.toggle("act-1");
    expect(favourites.ids).toEqual(new Set(["act-1"]));
    expect(stored(KEY_2026)).toEqual(["act-1"]);

    favourites.toggle("act-1");
    expect(favourites.ids).toEqual(new Set());
    expect(stored(KEY_2026)).toEqual([]);
  });
});
