// Favourites persistence (ADR-0019, ported by reference): act ids —
// Broadcast's `objectId`s verbatim, never array indices — under
// `fuzztid.favourites`. Stale ids self-heal on load.
import { beforeEach, describe, expect, it } from "vitest";
import { loadFavourites, saveFavourites, toggleFavourite } from "./favourites.ts";

const SCHEDULE_IDS = new Set(["act-1", "act-2", "act-3"]);

beforeEach(() => {
  localStorage.clear();
});

describe("loadFavourites", () => {
  it("returns an empty set on fresh localStorage — nothing starred", () => {
    expect(loadFavourites(SCHEDULE_IDS)).toEqual(new Set());
  });

  it("round-trips a starred set under the fuzztid.* namespace", () => {
    saveFavourites(new Set(["act-1", "act-3"]));
    expect(localStorage.getItem("fuzztid.favourites")).not.toBeNull();
    expect(loadFavourites(SCHEDULE_IDS)).toEqual(new Set(["act-1", "act-3"]));
  });

  it("silently prunes a favourite whose act vanished from the Schedule", () => {
    // A Reveal refresh dropped act-2 from the Schedule.
    saveFavourites(new Set(["act-1", "act-2"]));
    const mutatedSchedule = new Set(["act-1", "act-3"]);
    expect(loadFavourites(mutatedSchedule)).toEqual(new Set(["act-1"]));
  });

  it.each(["not json", '{"a":1}', "[1,2]"])(
    "falls back to nothing starred on a corrupt stored value (%s)",
    (raw) => {
      localStorage.setItem("fuzztid.favourites", raw);
      expect(loadFavourites(SCHEDULE_IDS)).toEqual(new Set());
    },
  );

  it("writes the pruned set back — a dropped id cannot resurrect later", () => {
    // If the pruned id ever reappears in a future Schedule, a stale star
    // must not spring back.
    saveFavourites(new Set(["act-1", "act-2"]));
    loadFavourites(new Set(["act-1"]));
    expect(JSON.parse(localStorage.getItem("fuzztid.favourites") ?? "[]")).toEqual(["act-1"]);
  });
});

describe("toggleFavourite", () => {
  it("stars, persists, unstars, persists", () => {
    const favourites = new Set<string>();
    toggleFavourite(favourites, "act-1");
    expect(favourites).toEqual(new Set(["act-1"]));
    expect(loadFavourites(SCHEDULE_IDS)).toEqual(new Set(["act-1"]));

    toggleFavourite(favourites, "act-1");
    expect(favourites).toEqual(new Set());
    expect(loadFavourites(SCHEDULE_IDS)).toEqual(new Set());
  });
});
