---
status: accepted
---

# The pipeline's two seams: `schedule.json` across, the Programme within

_New decision, original to Høstsabbat. Amends Øyablikk's
[0020](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0020-single-script-pipeline.md)
(the "pure core untouched by a source swap" claim is corrected; the single-script shape
stands), re-expresses
[0006](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0006-transform-fails-loud-on-input-violations.md)'s
triggers by side, and records the pipeline/app seam that
[#4](https://github.com/prudentmildew/fuzztid/issues/4) decided. Decided in
[#9](https://github.com/prudentmildew/fuzztid/issues/9); the invariants it places come from
[0023](./0023-broadcast-feed-as-programme-source.md).
**Amended by [0027](./0027-cloudflare-apex-and-the-unpublished-schedule-gate.md)**: §9's
pre-Reveal copy of the fixture is deleted, and the assembler's `null` Programme now has a
return value — the unpublished Schedule._

Øyablikk's pipeline is one script with a "thin shell, pure core" split, and 0020 claims
that swapping the source leaves the core untouched. It does not: `toSchedule` takes a
Sanity projection, the edition config carries Sanity `_ref`s and a `type` allowlist, and
one ~100-line loop does type allowlisting, ref resolution, time parsing, duplicate
guarding and grouping at once. Only the grouping is source-agnostic, and none of it is
testable without a Sanity-shaped fixture. This is the third copy of that pipeline, so the
seams are re-cut rather than re-copied.

## Decisions

### The outer seam: `scripts/` → `src/`, `data/schedule.json` the only crossing

1. **One directed edge.** `src/schedule.ts` owns the canonical `Schedule` / `Day` / `Act`
   / `Stage` types; `scripts/` imports them and `src/` imports nothing from `scripts/`.
   The producer depends on the consumer's contract, never the reverse.
2. **No app-side config.** `Stage` is `{ id, name }`; colour lives in `styles.css` keyed
   by `data-stage-id`, and the launch Day is `days[0]`. The pipeline owns **which Stages
   exist and in what order** (`schedule.stages[]` order is display order); CSS owns what
   they look like.

### The inner seam: the Programme

3. **Two functions and one type, no more.** The transform is split at the point where
   source vocabulary ends:

   ```
   readProgramme(payload: unknown): Programme | null   // scripts/broadcast.ts
   toSchedule(programme: Programme, config: EditionConfig): Schedule   // scripts/to-schedule.ts
   ```

   `Programme` is `ProgrammeAct[]`, lives in `scripts/`, and never crosses the outer
   seam. It reuses the glossary's word deliberately: the adapter's output *is* the
   Programme with the source's vocabulary neutralised, and the assembler turns the
   Programme into the Schedule. There is no adapter interface, registry or plugin —
   one source exists, and a hypothetical second one does not earn a type-level contract.
4. **A `ProgrammeAct` is Oslo-local.** `{ id, name, date, start, end, stage }` with
   `date` an ISO date, `start`/`end` `"HH:MM"` Oslo wall-clock, and `stage` the Stage's
   display name. The adapter owns the UTC → `Europe/Oslo` conversion, because the adapter
   is where "this source is in UTC" is known; the assembler is string-and-integer logic
   with no `Intl` in it. `start_min` / `end_min` are derived by the assembler, not carried.
5. **`null` means there is no Programme yet.** Before the Reveal every act is stageless;
   by the glossary a Programme is acts *with* times and Stages, so the pre-Reveal payload
   is a lineup, not a Programme. `readProgramme` returns `null` (a value, not an
   exception — 0023's "known state, exit 0, no write"), and the shell branches once.
   Some-but-not-all stageless throws from the same predicate: a partial Reveal.
6. **Validation is split by side.** The adapter holds the **source-shape checks**, phrased
   in Broadcast's vocabulary and taking the parsed JSON as `unknown` with hand-rolled
   guards for exactly the consumed fields (`objectId`, `name`, `start_time_iso`,
   `end_time_iso`, `externalVenueName`, `isMainSchedule`): array shape, field types,
   ISO parse, `isMainSchedule: false`, the published predicate. The assembler holds the
   **canonical invariants**, phrased in the glossary's vocabulary, in this order: known
   Stage, known Day, `end > start`, unique id, per-Stage no-overlap (back-to-back
   allowed). Then group, envelope, sort — days by date, acts by `start_min` then id,
   Stages in config order, every configured Stage present possibly empty. An act
   crossing midnight arrives Oslo-local as `end < start` and trips the existing
   invariant; no extra check.
7. **The edition config is `{ festival, days, stages }`** in `scripts/edition-config.ts`,
   exported as `HOSTSABBAT_2026` — the one file that changes between editions. `stages`
   is the canonical `Stage[]` and **the Stage's `name` is the source match**: Broadcast's
   `externalVenueName` is already the display name (`The Chapel`, `The Crypt`,
   `Verkstedet`), so no separate match key exists. `days` is the edition's dates, checked
   as "known Day" beside "known Stage" — a stray date is a red run, not a silent third
   pane; the Day *count* stays data-driven (a configured date with no acts yields no
   pane). The Sanity `days` ref-map and the `parkTypes` / `excludedTypes` allowlist are
   gone — Broadcast has neither, and 0023 gives `isMainSchedule` no allowlist until a
   census earns one — and with them `ToScheduleResult`'s `excluded` envelope. The
   Broadcast host and URL are not edition config; `broadcastUrl(festivalId, key)` sits
   beside `readProgramme`, so the shell is fetch → `json()` → `readProgramme` →
   `toSchedule` → write and nothing else.

### Tests

8. **The interface is the test surface.** `to-schedule.test.ts` uses hand-written
   `ProgrammeAct[]` — one test per invariant plus grouping/envelope/sort, no fixture.
   `broadcast.test.ts` uses hand-written Broadcast objects for shape errors,
   `isMainSchedule: false`, the published predicate (all empty → `null`, some → throw),
   and the time-zone conversion pinned with both a CEST and a CET instant so a `+2`
   shortcut cannot pass.
9. **One golden test gives the app's fixture provenance.** `toSchedule(readProgramme(
   fixture2025), HOSTSABBAT_2025)` is pinned to `src/fixtures/schedule.fixture.json`
   with Vitest's `toMatchFileSnapshot`, so the fixture the app's tests run against is
   generated from the real 2025 payload and regenerated with `vitest -u` when the
   transform legitimately changes. `HOSTSABBAT_2025` is exported from
   `edition-config.ts` beside 2026 and documents the previous edition, and is how a
   developer gets rich data before the Reveal. **Amended**: `data/schedule.json` is *not* a
   pre-Reveal copy of this fixture. It is the unpublished 2026 Schedule that
   `toSchedule(null, HOSTSABBAT_2026)` returns — the Edition's Days and Stages, no Acts —
   because the app is deployed and public months before the Reveal and must render something
   true ([0027](./0027-cloudflare-apex-and-the-unpublished-schedule-gate.md) §5–§8). The
   golden test is untouched; at the Reveal the cron overwrites the unpublished file and
   nothing breaks.

## Considered options

- **Keep one function and extract helpers.** Smallest diff, but the assembler's tests
  still need Broadcast-shaped input and the six jobs stay in one loop.
- **A full adapter interface** (`SourceAdapter`, a registry). Pays nothing at one source;
  a second adapter would make the seam real, and the two-function shape accepts one
  without ceremony.
- **Programme carries instants; the assembler converts.** More "neutral", but every
  assembler test then hand-converts UTC to CEST and the assembler needs an explicit
  same-Oslo-date check. The Programme is one step from the Schedule and should speak its
  units.
- **A `NotPublishedError`** for the pre-Reveal state. Rejected on principle: it is not an
  error. A discriminated union was the runner-up; `null` is domain-correct and smaller.
- **A separate `venue` match key on `StageConfig`.** A hedge against relabelling a room
  that nobody has asked for; a Broadcast rename is a red run and a one-line edit either
  way, and it now changes the label too, which is right.
- **Derive the edition's dates.** Simpler, and lets a stray act quietly grow a third
  pane — the exact "looks fine, is wrong" outcome 0006 exists to prevent.
- **Pin the golden test to `data/schedule.json`.** Simpler today; breaks on Reveal day,
  the one day nothing may break.

## Consequences

- 0020's "the pure core and everything downstream are untouched" becomes true at the
  Programme seam: replacing the source means a new `readProgramme`, a new
  `broadcast.test.ts`, and nothing else.
- 0006's error vocabulary is split: adapter errors name Broadcast fields and
  `objectId`; assembler errors name Stages, Days and Acts. Every error still names the
  offending act and a remediation hint.
- `Europe/Oslo` is hard-coded on both sides of the outer seam (`src/now.ts` already
  does); the `scripts/` → `src/` edge allows importing the one constant rather than
  repeating it.
- The framework question the map carried as fog is not raised: this seam is entirely
  `scripts/`-side and touches no UI code.
