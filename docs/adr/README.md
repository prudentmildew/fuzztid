# Architecture Decision Records

Høstsabbat's app is the third copy in a lineage — Tons o'Clock → Øyablikk → here — and
Øyablikk's ADRs (`prudentmildew/oyablikk`, `docs/adr/0003`–`0022`) are **ported by
reference**, not restated: where a decision still holds, this repo cites it by its
Øyablikk number and says nothing more. Decisions that differ get a fresh ADR here,
numbered **above** Øyablikk's range so that every `ADR-NNNN` reference in the map, the
tickets and the code resolves without translation.

Each new ADR opens with a lineage note naming which Øyablikk ADRs it supersedes, amends
or leaves standing.

## Index

| ADR | Decision |
|---|---|
| [0023](./0023-broadcast-feed-as-programme-source.md) | Broadcast festival feed as the programme source: build-time snapshot, hourly October cron, `objectId` identity, published predicate, no-overlap invariant |
| [0024](./0024-programme-as-the-pipeline-seam.md) | The pipeline's two seams: `data/schedule.json` is the only thing crossing `scripts/` → `src/`; inside, a Broadcast adapter emits the Programme (Oslo-local, `null` before the Reveal) and a source-agnostic assembler holds the canonical invariants |
| [0025](./0025-single-fill-palette-no-stage-colour.md) | One dark palette, no Stage colour: three columns separate by position, the accent means only *now* and *starred*, the tokens live in `styles.css` and stay a tested artefact at a fraction of the machinery |
| [0026](./0026-two-day-switcher-in-the-header.md) | Two Day tabs in the Header row, measured to fit at 360 px: labels `FRI 23` / `SAT 24`, *selected* carried by weight and *today* by a 6 px accent dot, and the panes never rebuilt on a swipe |
| [0027](./0027-navigation-race-precache-only-fallback.md) | The navigation route: a two-second race with a precache-only fallback — the runtime document cache is deleted as either redundant or harmful, `NetworkFirst` and two workbox deps go with it, and `og.png` leaves the precache glob |
| [0028](./0028-cloudflare-apex-and-the-unpublished-schedule-gate.md) | `fuzztid.no` from the first deploy, Cloudflare-proxied with Pages as the origin so no analytics token enters the repo; the Reveal gate is a property of the data — the app ships months early and renders an unpublished Schedule until the cron flips it |
