// TEMPORARY (ADR-0030): hand-entered slots for acts Broadcast has left on a
// placeholder window after the running order went in. Applied to the
// Programme between readProgramme and toSchedule, so it speaks Oslo-local
// wall-clock like the assembler and never sees Broadcast's field names.
//
// Each override is pinned to the exact slot it corrects, and applies only
// while the feed still carries that slot. The moment the feed says anything
// else for the act — a real slot, any slot, or no act at all — the feed wins
// and the override steps aside: the refresh stays green and the festival's
// answer reaches phones without anyone touching anything. The override is
// then reported stale, which is the prompt to delete it (and this file, once
// the list is empty).

import type { Programme } from "./broadcast.ts";

export type SlotOverride = {
  /** Broadcast's `objectId`. */
  id: string;
  /** For messages only; matching is by id. */
  name: string;
  /** The placeholder slot the feed carries, which this override replaces. */
  expected: { date: string; start: string; end: string };
  /** The slot written to the Schedule instead. */
  replacement: { start: string; end: string };
};

/** An override the feed no longer needs, and why — for a notice, never an error. */
export type StaleOverride = { override: SlotOverride; reason: string };

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
): { programme: Programme | null; stale: StaleOverride[] } {
  if (overrides.length === 0) return { programme, stale: [] };
  if (programme === null) {
    // Not a correct schedule being published: the feed has gone back to a
    // pre-Reveal state two weeks after the Reveal. Without this throw the
    // pipeline would write the unpublished Schedule over the real one, so it
    // stays red and main keeps the last good Schedule until a human looks.
    throw new Error(
      `Slot overrides are set (${overrides.map((o) => o.name).join(", ")}) but Broadcast has no Programme — ` +
        "the feed is back to a pre-Reveal state. Check the feed before anything deploys (ADR-0030).",
    );
  }

  const stale: StaleOverride[] = [];
  for (const override of overrides) {
    if (!programme.some((act) => act.id === override.id)) {
      stale.push({
        override,
        reason: `"${override.name}" (${override.id}) is no longer in the Broadcast feed, so the feed's Schedule is used without it.`,
      });
    }
  }

  const applied = programme.map((act) => {
    const override = overrides.find((o) => o.id === act.id);
    if (override === undefined) return act;
    const { date, start, end } = override.expected;
    if (act.date === date && act.start === start && act.end === end) {
      return { ...act, ...override.replacement };
    }
    stale.push({
      override,
      reason: `Broadcast now has "${act.name}" (${act.id}) at ${act.date} ${act.start}–${act.end}, not the ${date} ${start}–${end} placeholder, so the feed's slot is used.`,
    });
    return act;
  });

  return { programme: applied, stale };
}
