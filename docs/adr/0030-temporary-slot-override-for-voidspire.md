---
status: temporary
---

# A temporary slot override for Voidspire

_New decision, original to Høstsabbat. **Suspends [0023](./0023-broadcast-feed-as-programme-source.md)
§7 for exactly one act** without loosening the invariant itself. Temporary by construction:
delete this ADR, `scripts/slot-overrides.ts` and its test the day the hourly cron goes red on
it._

## Context

Broadcast's running order went in on 14 October 2026, about 09:00–10:20 UTC. 23 of the 24
acts got real slots. Voidspire (`g2dz3dGOLT`) stayed on Kafé Hærverk, Friday 23 October,
**19:00–22:59**, which is one of the placeholder windows 0023 §6 lists. That window overlaps
Gloombound (20:30–21:15) and Rosa Faenskap (22:30–23:15) in the same room, so §7 failed the
hourly refresh
([run 38614295973](https://github.com/prudentmildew/fuzztid/actions/runs/38614295973)) and no
running order could deploy. The invariant was right: this is the "running order entered in
some rooms and the rest still stacked on their windows" state it exists to catch.

Nine days before doors, waiting for Broadcast to be corrected leaves the app with no
running order at all. Every other room and Day has four evenly spaced sets, and Kafé
Hærverk's Friday is missing a slot at about 19:00. Voidspire is entered by hand at
**19:00–19:45**. The first entry, 19:00–20:15, was a guess and was corrected the same day.

## Decision

1. **One hand-entered slot, pinned to the placeholder it replaces.** `SLOT_OVERRIDES` in
   `scripts/slot-overrides.ts` matches on `objectId` and replaces the slot only while the feed
   still says exactly `2026-10-23 19:00–22:59`. It is applied to the Programme between
   `readProgramme` and `toSchedule`, in Oslo-local wall-clock, so the 0024 seams hold: the
   assembler and its invariants never learn an override happened.
2. **§7 is not touched.** The assembler still refuses any overlap, so a typo in the
   override is a red run like any other.
3. **The override fails loud once the feed changes.** If Broadcast shows anything other than
   the pinned placeholder for that act, `applySlotOverrides` throws and the hourly refresh
   fails before committing. That includes a different slot, the act being gone, the feed
   going back to no Programme, and even exactly 19:00–19:45. Main keeps the last good
   Schedule, with the override applied, until a human acts.
4. **The red run is the message.** GitHub emails failed scheduled runs, which is how this
   problem surfaced in the first place. The error names the act, its new slot, and the
   remedy: remove the override and retire this ADR. Then reconcile together: check the
   feed's new slot against 19:00–19:45, delete the override, its test and this ADR, and run
   the refresh.

## Rejected

- **Loosening §6 or §7** (for example, ignoring acts on a known placeholder window). That
  would hide the next half-entered room as well, without anyone noticing.
- **Editing `data/schedule.json` by hand.** The next hourly run would overwrite it with
  another red run, or with the feed's version once fixed, and nothing would mark the hand
  edit as stale.
- **Overriding unconditionally.** The festival's eventual fix would be silently ignored,
  and the app would show our guess over their answer.
