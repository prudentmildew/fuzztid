// TEMPORARY (ADR-0030): hand-entered slots for acts Broadcast has left on a
// placeholder window after the running order went in. Applied to the
// Programme between readProgramme and toSchedule, so it speaks Oslo-local
// wall-clock like the assembler and never sees Broadcast's field names.
//
// Each override is pinned to the exact slot it corrects. The moment the feed
// says anything else for that act — fixed, moved, removed — the override is
// stale and the run goes red, which is the signal to delete it (and this
// file, once the list is empty) and let the feed speak for itself.

import type { Programme } from "./broadcast.ts";

export type SlotOverride = {
  /** Broadcast's `objectId`. */
  id: string;
  /** For the error message only; matching is by id. */
  name: string;
  /** The placeholder slot the feed carries, which this override replaces. */
  expected: { date: string; start: string; end: string };
  /** The slot written to the Schedule instead. */
  replacement: { start: string; end: string };
};

export const SLOT_OVERRIDES: SlotOverride[] = [
  {
    id: "g2dz3dGOLT",
    name: "Voidspire",
    expected: { date: "2026-10-23", start: "19:00", end: "22:59" },
    replacement: { start: "19:00", end: "19:45" },
  },
];

export function applySlotOverrides(
  programme: Programme | null,
  overrides: readonly SlotOverride[],
): Programme | null {
  if (overrides.length === 0) return programme;
  if (programme === null) {
    throw new Error(
      `Slot overrides are set (${overrides.map((o) => o.name).join(", ")}) but Broadcast has no Programme — ` +
        "the feed is back to a pre-Reveal state. Remove the overrides in scripts/slot-overrides.ts (ADR-0030).",
    );
  }

  // An override whose act has vanished from the feed is just as stale.
  const missing = overrides.find((o) => !programme.some((act) => act.id === o.id));
  if (missing !== undefined) {
    throw new Error(
      `"${missing.name}" (${missing.id}) is no longer in the Broadcast feed, but scripts/slot-overrides.ts still overrides it. Remove the override (ADR-0030).`,
    );
  }

  return programme.map((act) => {
    const override = overrides.find((o) => o.id === act.id);
    if (override === undefined) return act;
    const { date, start, end } = override.expected;
    if (act.date !== date || act.start !== start || act.end !== end) {
      throw new Error(
        `Broadcast now has "${act.name}" (${act.id}) at ${act.date} ${act.start}–${act.end}, ` +
          `not the ${date} ${start}–${end} placeholder the temporary override corrects. ` +
          "The feed has changed — remove the override in scripts/slot-overrides.ts and retire ADR-0030.",
      );
    }
    return { ...act, ...override.replacement };
  });
}
