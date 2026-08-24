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
