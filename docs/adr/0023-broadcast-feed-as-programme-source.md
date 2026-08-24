---
status: accepted
---

# Broadcast festival feed as the programme source

_New decision, original to Høstsabbat. Supersedes-by-reference Øyablikk's
[0018](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0018-sanity-content-lake-as-programme-source.md)
(the Sanity source) and amends
[0020](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0020-single-script-pipeline.md)
(cadence, the published predicate) and
[0006](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0006-transform-fails-loud-on-input-violations.md)
(triggers re-expressed for Broadcast, one new invariant). 0019 and the rest of 0020 port
by reference unchanged. Decided in
[#8](https://github.com/prudentmildew/fuzztid/issues/8) on the evidence of
[#6](https://github.com/prudentmildew/fuzztid/issues/6) and
[#7](https://github.com/prudentmildew/fuzztid/issues/7)._

Høstsabbat publishes no structured programme of its own: `hostsabbat.no` is Squarespace
with no events collection, and the schedule ships as JPEGs plus a fontless Photoshop PDF.
The only surface with times and stages is the third-party **Broadcast** platform, which
the festival sanctions by embedding Broadcast's official widget on its own lineup pages.
The programme endpoint the widget calls is the source:

```
GET https://demo.broadcastapp.no/api/v1/festivals?key=<widget-key>&festival=<festival-id>
```

A flat array of acts — `objectId`, `name`, `start_time_iso`/`end_time_iso` (UTC),
`externalVenueName` (the Stage), `isMainSchedule`. Festival ids are per edition:
`XIanfZspWO` (2026), `dEoMHOghYt` (2025). The 2025 payload validates clean against every
invariant below; the 2026 one is a placeholder until the Reveal.

## Decisions

1. **Broadcast, alone.** No hand-maintained `schedule.json`, no hybrid. The festival's
   reveal images are a one-time verification aid, not a source.
2. **Fetch at build time from CI, never per visitor.** The app ships a committed
   `data/schedule.json`; no browser ever calls Broadcast. Øyablikk's refresh workflow
   (fetch → `git diff --quiet` → test → bot commit → `workflow_call` deploy) ports by
   reference; only the cadence changes: **an hourly cron scoped to October**
   (`0 * * 10 *`) plus `workflow_dispatch` year-round. Broadcast's edge caches ~10 min, so
   hourly is the honest granularity; a no-op run is ~10 s. The line never needs
   commenting in or out between editions.
3. **The key is a secret, never committed.** `BROADCAST_KEY` as a GitHub Actions secret
   and a local env var; the script fails loud when it is unset. The widget key is a
   public constant in Broadcast's `widget.js`, so this is not secrecy — it keeps the repo
   from reading as an independent API client, and it swaps cleanly to a granted key.
4. **Stages come from `externalVenueName`**, matched against the pipeline's configured
   Stage list (the pipeline owns which Stages exist and in what order —
   [#4](https://github.com/prudentmildew/fuzztid/issues/4)). The metadata endpoint
   (`www.broadcast.events/api/v1/festivals/{id}`, no CORS, absent `stages[]` on 2026) is
   not used. An unmatched name throws (0006's unmapped-stage trigger).
5. **Act identity is `objectId` verbatim.** It is the Parse row id: stable across
   refreshes while times and stage change under it, unique per edition, and one per
   *performance* (YOB played both nights in 2025 and has two ids), which is exactly
   0019's "one act = one performance". 0019 ports by reference with 0020's duplicate-id
   guard. Ids are per festival record, so Favourites reset between editions — correct.
6. **The published predicate.** Before the Reveal every act carries an empty
   `externalVenueName` and one shared placeholder slot. The pipeline checks first: if
   **every** act has an empty Stage, log "programme not published" and exit 0 without
   writing — a known state, on the model of 0006's allowlisted-exclusion carve-out, not a
   softening of fail-loud. If **some** acts have a Stage, throw: that is a partial Reveal.
7. **A per-Stage no-overlap invariant.** Høstsabbat's Stages are rooms in one building;
   two acts overlapping on one Stage is physically impossible. The assembler throws on
   it. This is the check that catches a Reveal half-entered in Broadcast's CMS — stages
   filled in, times still on the 13:00→23:00 placeholder, which `end > start` alone would
   pass. Back-to-back (one ends 15:00, the next starts 15:00) is allowed; the 2025
   stagger needs it.
8. **`isMainSchedule: false` throws.** All 49 acts seen across two editions are `true`;
   `false` is unverified, and 0006's allowlisted exclusion was earned by a census, not
   assumed. A red run and a one-line human decision is the cheap, honest response at 25
   acts; only then does an allowlist grow.
9. **No raw mirror; 0020 stands.** The schedule is what is worth preserving against a
   dead key, and the committed `schedule.json` is that. The research captures
   (`research/broadcast-api`, key redacted) become the test fixtures in
   `scripts/fixtures/`; `git log -- data/schedule.json` is the change history.
10. **Times convert UTC → Oslo wall-clock via `Europe/Oslo`**, never a hard-coded offset.
    The Day is the Oslo-local date. The 2026 festival (23–24 Oct) sits inside CEST — DST
    ends Sunday 25 Oct — so no act straddles the switch.
11. **Before the Reveal, the committed `data/schedule.json` is the 2025 programme**, produced
    by the same transform over the 2025 fixture — one code path, no `--festival` override.
    The fetch script targets 2026 from day one and the cron is a no-op until the Reveal.
    There is no lineup-only pre-Reveal mode: the festival's own page already provides
    the lineup, and the window is ~four days. **The public go-live is gated on the
    Reveal**; how that gate is expressed belongs to the deploy decision.

## Shipping condition

Permission is an ask, not a fight ([#13](https://github.com/prudentmildew/fuzztid/issues/13)):
Broadcast publishes no terms, its FAQ offers partner data access on request, and the
festival embeds the same feed. **If there is no answer by the Reveal, ship on the
build-time snapshot** — single-digit fetches a day on the widget key, byte-for-byte what
every visitor to `hostsabbat.no` triggers, attributed with a link to Broadcast. A "no" at
any time takes it down. A "yes" swaps the secret and changes nothing else.

## Considered options

- **Hand-transcribed `schedule.json` from the reveal images** (alone or as a hybrid with
  Broadcast as a dev-time cross-check). Rejected: it puts a human transcription of ~25
  rows on the critical path in the busiest week, and again on every change.
- **Nightly cron as in Øyablikk.** Rejected: a change posted Friday afternoon would reach
  phones Saturday 03:00 — fine across four days, too slow across two.
- **`workflow_dispatch` only.** Rejected: someone has to remember to press it from inside
  a stone church.
- **Let 0006 throw on the pre-Reveal placeholder.** Rejected: ~500 red runs before the
  Reveal, drowning the one that matters.
- **Exclude `isMainSchedule: false` with a warn.** Rejected: unverified semantics; 0006 says
  unknown throws.
- **Hard gate on permission** (no public deploy until a yes) and **fall back to
  hand-transcription on silence**. Rejected in favour of the snapshot-with-deadline above.
- **Stages from the metadata endpoint.** Rejected: a second, CORS-less fetch for data the
  programme already carries.

## Consequences

- The transform seam ([#9](https://github.com/prudentmildew/fuzztid/issues/9)) is
  designed against a Broadcast adapter and a source-agnostic assembler holding the
  canonical invariants: `end > start`, unique ids, known Stage, **no overlap per Stage**.
- The key rotating or `demo.broadcastapp.no` retiring degrades to a stale programme
  and a red run, never an empty app.
- The deploy decision inherits "go-live gated on the Reveal" as an input.
