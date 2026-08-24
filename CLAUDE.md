# CLAUDE.md

## The project

A mobile web app for the **Høstsabbat** festival programme in Oslo. Adapted from
[Øyablikk](https://oyablikk.no) (`prudentmildew/oyablikk`), the sibling app for Øya
Festivalen — copy its shape and conventions rather than inventing new ones, and
port ADRs across by reference where the decision still holds.

The repo is **empty as of this writing**. The domain vocabulary, the festival's
dates, stages and venues, and the app's actual shape are all still open — they
get pinned down in the `/wayfinder` session that follows this setup, and land in
`CONTEXT.md` and `docs/adr/` as they resolve. Don't assume Øyablikk's specifics
(seven park stages, four August days, a Sanity content lake) carry over;
Høstsabbat is a different festival with a different programme structure.

## Toolchain

Not chosen yet. Øyablikk's stack is the starting proposal: pnpm, Node ≥ 24,
vanilla TypeScript + Vite with no UI framework, Vitest + happy-dom for tests,
Biome for lint and format, GitHub Pages for deploys. Confirm or replace it in
the Wayfinder session before writing code, then rewrite this section with what
was actually chosen.

## Agent skills

### Issue tracker

Issues and specs live as GitHub issues, managed via the `gh` CLI. External PRs are **not** a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Git practices

Commit subjects are a gitmoji plus a short imperative phrase (`✨ add the stage
filter`) — no `type(scope):`, and **no `Co-Authored-By:` trailers**. See
`docs/agents/git-practices.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
