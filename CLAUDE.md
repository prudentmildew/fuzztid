# CLAUDE.md

## The project

A mobile web app for the **Høstsabbat** festival programme in Oslo. Adapted from
[Øyablikk](https://oyablikk.no) (`prudentmildew/oyablikk`), the sibling app for Øya
Festivalen — copy its shape and conventions rather than inventing new ones, and
port ADRs across by reference where the decision still holds.

The design is **settled**, not open. The
[wayfinder map](https://github.com/prudentmildew/fuzztid/issues/1) closed after fifteen
tickets, and the port is ready to build. The vocabulary lives in `CONTEXT.md` and the
decisions in `docs/adr/` (0023–0028) — but four resolutions deliberately wrote no ADR
and live only in their closed tickets: the toolchain
([#2](https://github.com/prudentmildew/fuzztid/issues/2)), the feature scope
([#3](https://github.com/prudentmildew/fuzztid/issues/3)), what the seam owns
([#4](https://github.com/prudentmildew/fuzztid/issues/4)) and the launch choreography
([#5](https://github.com/prudentmildew/fuzztid/issues/5)). `docs/adr/` alone is not the
whole brief.

Høstsabbat is **not** Øyablikk with different data. Where Øyablikk has seven park stages,
four August days and a Sanity content lake, this app has three Stages that are rooms
inside one building (Kulturkirken Jakob), two Days (23–24 October 2026), and a
third-party Broadcast feed. Where an Øyablikk decision still holds it ports by
reference; where it doesn't, a fresh ADR above its number range says so.

## Toolchain

Inherited from Øyablikk wholesale — pnpm, Node ≥ 24, vanilla TypeScript + Vite with
no UI framework, Vitest + happy-dom for tests, Biome for lint and format, GitHub
Pages for deploys. Settled in [#2](https://github.com/prudentmildew/fuzztid/issues/2);
the stack was already the minimal one, so there was nothing to remove without adding
work. The *simplify* brief on the map is about module seams and line count, not build
tools.

**Versions float within major.** Dependencies carry carets and resolve fresh — do not
copy Øyablikk's `pnpm-lock.yaml`, and do not carry its `minimumReleaseAgeExclude`
escape hatch. A new repo has no reproducibility debt to protect. The two exact pins:
`packageManager` is `pnpm@11.23.0`, and `engines.node` is `>= 24` with CI on 24 —
Node 24 is LTS, and nothing here wants Node 26.

**`tsconfig.json` and `biome.json` copy verbatim**, which makes two of their flags
project rules rather than inherited style: `erasableSyntaxOnly` bans enums,
namespaces and parameter properties, and `allowImportingTsExtensions` means import
specifiers carry the `.ts` extension. `noUncheckedIndexedAccess` and
`verbatimModuleSyntax` are on.

**The service worker survives the port**, decided in
[#3](https://github.com/prudentmildew/fuzztid/issues/3), so Øyablikk's two-config
typecheck split stays with it: `tsconfig.worker.json` typechecks `src/sw.ts` against
the WebWorker lib, and both `typecheck` scripts remain. Do not merge the two configs
into one with `lib: ["DOM", "WebWorker"]` — the globals conflict and the errors are
silent.

The PWA dependencies are **four** — `vite-plugin-pwa` plus `workbox-precaching`,
`workbox-routing` and `workbox-window` — on ten devDependencies total.
[ADR-0027](docs/adr/0027-navigation-race-precache-only-fallback.md) drops
`workbox-strategies` and `workbox-cacheable-response` along with the runtime document
cache. Øyablikk carries six PWA deps on twelve, not the five on eleven this file
previously claimed.

The pre-commit hook stays opt-in per clone (`git config core.hooksPath .githooks`):
lint-fix and re-stage, then typecheck, then the suite. `deploy.yml` is the real gate
on `main`.

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
