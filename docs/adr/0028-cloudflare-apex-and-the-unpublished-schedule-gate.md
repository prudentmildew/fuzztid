---
status: accepted
---

# `fuzztid.no` from the first deploy, and the Reveal gate as a property of the data

_New decision, original to Høstsabbat. Ports Øyablikk's
[0009](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0009-github-pages-deploy.md)
(GitHub Pages deploy),
[0015](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0015-custom-domain-apex-no-cname-file.md)
(apex custom domain) and
[0016](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0016-cloudflare-web-analytics-supersedes-no-third-party.md)
(Cloudflare Web Analytics) by reference, each with one clause struck. **Amends
[0023](./0023-broadcast-feed-as-programme-source.md) §6 and §11**, extends
[0024](./0024-programme-as-the-pipeline-seam.md)'s assembler to the null Programme, and
qualifies [0026](./0026-two-day-switcher-in-the-header.md)'s Header. Leans on
[0027](./0027-navigation-race-precache-only-fallback.md) for delivery — the Reveal reaches an
already-installed phone through the route it decides. Decided in
[#15](https://github.com/prudentmildew/fuzztid/issues/15)._

_**Amended 2026-08-25** in [#31](https://github.com/prudentmildew/fuzztid/issues/31), in
place: §9's inventory of the unpublished screen gains the `HØSTSABBAT 2026` line above the
dates. Marked where it sits._

Øyablikk's three deploy ADRs were all written while its domain was still an open question,
so each carries a migration: 0009 designs a subpath *today* with portable paths for a
custom domain *tomorrow*, 0015 describes the cut-over, and 0016 registers the analytics
token against the github.io URL until the domain resolves. **fuzztid's domain is settled
before the first deploy** — `fuzztid.no`, registered 24 August 2026 — so all three
migrations are skipped rather than performed.

0023 §11 left one thing to this decision: *"the public go-live is gated on the Reveal; how
that gate is expressed belongs to the deploy decision."* It is not expressed in the deploy
at all.

## Decisions

1. **`fuzztid.no`, apex, from the first deploy.** There is no
   `prudentmildew.github.io/fuzztid/` phase. 0015's apex-canonical stance and its **no
   `CNAME` file** mechanism port unchanged: Actions-based Pages deploys ignore the file, so
   the domain belongs in repo Settings → Pages. 0009's portable paths — `base: './'`,
   relative `./manifest.webmanifest` and `./apple-touch-icon.png`, `start_url`/`scope` of
   `"."`, manifest `id` of `"/"` — port anyway even though nothing will migrate: they cost
   nothing and keep the github.io origin working as a fallback. The two Open Graph tags are
   the one exception 0015 names, and they say `https://fuzztid.no` literally.

2. **Cloudflare nameservers, proxied, with GitHub Pages as the origin.** 0015's *"apex DNS
   uses GitHub Pages' four `A` and four `AAAA` records"* does **not** port — that sentence
   describes an arrangement Øyablikk does not run. In production `oyablikk.no` resolves to
   Cloudflare nameservers and Cloudflare anycast addresses, with Pages behind them
   (`x-github-request-id` on every response). The consequence that earns the extra party:
   0016's beacon is **injected at the edge**, so no analytics snippet and no site token ever
   enters this repo. Verified on the sibling — its `index.html` carries a comment where the
   snippet would be, and a browser-UA request to `oyablikk.no` comes back with
   `beacon.min.js` and a `cf-beacon` token that appears nowhere in its source.

3. **The beacon is on from the first deploy.** 0016's Øya delta — register the token against
   the github.io URL until the custom domain is live — dissolves along with the subpath: one
   hostname, enabled once. It counts the pre-Reveal months deliberately. Whether anyone finds
   the app before the Programme lands is the measurement that says whether sharing the link
   early was worth doing.

4. **The domain stays parked until the port's first deploy.** Pages with
   `build_type: workflow` needs a successful deploy before a custom domain validates, so
   cutting DNS over ahead of the port trades a parked page for a 404 and spends the
   certificate on a site that does not exist. The cut-over is a step *in* the port.

5. **The Reveal gate is a property of the data, not a step in the deploy.** Nothing is held
   back. The app deploys once, months early, at its real address, and renders an
   **unpublished Schedule** honestly until the Programme lands. At the Reveal the hourly
   October cron (0023 §2) sees `externalVenueName` fill in, writes a real Schedule, commits
   and calls `deploy.yml`; anyone who installed early receives it through 0013's silent
   auto-update. Because
   [0027](./0027-navigation-race-precache-only-fallback.md) keeps the schedule inlined in the
   JS bundle, the flip from unpublished to published *is* a new bundle — there is no second
   fetch to get wrong, and no cached data file that can outlive the shell that reads it. **No human flips anything**, which is the same argument 0023 §2 already made
   against a `workflow_dispatch`-only cadence.

6. **0023 §6 amended: the pipeline writes the unpublished Schedule instead of exiting 0.**
   Where §6 says *"log 'programme not published' and exit 0 without writing"*, it now writes
   `data/schedule.json` carrying the Edition's Days and Stages from the config and no Acts.
   Still one code path, still not a softening of fail-loud: `git diff --quiet` means it
   commits once and no-ops hourly thereafter. The partial-Reveal throw is untouched.

7. **0023 §11 amended: the pre-Reveal committed `data/schedule.json` is the unpublished 2026
   Schedule, not the 2025 programme.** 2025 does not disappear —
   [#9](https://github.com/prudentmildew/fuzztid/issues/9) already put the payload in
   `scripts/fixtures/` and `HOSTSABBAT_2025` in `scripts/edition-config.ts`, so a developer
   gets a full schedule by pointing the pipeline at the 2025 config, and the golden test
   against `src/fixtures/schedule.fixture.json` is untouched. This **deletes** 0024's
   "pre-Reveal `data/schedule.json` is a copy of the fixture". §11's other clauses stand:
   the fetch script targets 2026 from day one, there is no `--festival` override, and there
   is no lineup-only pre-Reveal mode.

8. **`toSchedule(null, config)` returns the unpublished Schedule.** 0024 already models "no
   Programme yet" as `readProgramme(payload): Programme | null`; the assembler carrying that
   `null` through to a Schedule with Days, Stages and no Acts is the existing seam extended,
   not a new concept. **No new type**, and the invariants have nothing to check.

9. **The unpublished screen.** The `fuzztid` wordmark and the ⓘ; the Edition's dates and
   venue — 23–24 October 2026, Kulturkirken Jakob; one line saying the programme is
   published a few days beforehand; and a link to `hostsabbat.no`, which is where §11 already
   put the Lineup. _Amended 2026-08-25 ([#31](https://github.com/prudentmildew/fuzztid/issues/31)):
   the screen leads with `HØSTSABBAT 2026` above the dates — the Festival's name a constant
   in `unpublished.ts`, the year derived from the Schedule's first Day, and no heading: the
   `<h1>` stays the wordmark's (0026 §3)._ **0026's two Day tabs and the ♥ are absent**: the tabs have no Days to
   move between and 0021's Focus has nothing to dim, so the unpublished Header is the
   wordmark and the ⓘ alone. This does not disturb 0012 — chrome is static across Day
   *swipes*, and there are none here.

10. **English, deliberately rather than by inheritance.** Øyablikk is `lang="en"` throughout
    and Høstsabbat draws Norwegian and international doom audiences in roughly equal measure.
    One language, no detection, no toggle — the same stance 0025 takes on themes and
    [#3](https://github.com/prudentmildew/fuzztid/issues/3) takes on install copy.

## Considered options

- **The origin gate**: deploy to the github.io subpath continuously and point `fuzztid.no` at
  Pages only at the Reveal. Rejected twice over. Obscurity stops being a gate the moment the
  link is shared, and sharing it early is the whole point of a format people install; and it
  puts a DNS cut-over plus 0015's *up to 24 h* certificate wait inside the four-day Reveal
  window — someone pressing buttons from inside a stone church, which is exactly what 0023 §2
  refused.
- **A holding page swapped at the Reveal.** Rejected: two artifacts to build and a manual swap
  in the busiest week, to produce a worse pre-Reveal page than the app's own honest one.
- **Deploy the 2025 programme publicly, labelled as 2025.** Rejected: two months of a festival
  app whose entire content is last year, with a Now line that means nothing in August.
- **A lineup-only pre-Reveal mode.** Already rejected by 0023 §11 and still rejected — but the
  distinction matters: that was artist names, a second data path and a second view. §9 above
  is one paragraph of static copy and no programme data at all.
- **Domeneshop DNS pointed straight at Pages** (0015 literally), with 0016's beacon as a
  `<script>` and a per-hostname token maintained in `index.html`. Rejected: a simpler topology
  bought by putting a third-party snippet and a rotating token into a repo that can be free of
  both.
- **No analytics until the Reveal.** Rejected: the pre-Reveal months *are* the measurement.

## Consequences

- **Moving nameservers off Domeneshop breaks DNSSEC if done naively.** `fuzztid.no` is signed
  at Norid today (two DS records, algorithm 15). The DS records must be removed and resolution
  allowed to settle **before** the nameservers move to Cloudflare, or the domain goes dark;
  re-sign at Cloudflare afterwards if wanted. Domeneshop stays the registrar either way.
- **The certificate wants a grey-cloud step.** GitHub provisions its Let's Encrypt certificate
  against a DNS-only record, so expect: cut over grey → let Pages validate and Enforce HTTPS →
  turn the proxy on → set Cloudflare SSL to Full (strict). Fiddly, which is precisely why it
  happens months early instead of four days out.
- **Two parties can now take the site down** during the festival rather than one. Accepted:
  the sibling has run this arrangement for a year, and a statically built, build-time-baked
  site has no other moving parts.
- **The app carries one screen Øyablikk does not** — and it is the screen most visitors will
  see first, for two months.
- The app is live at its final origin from day one, so **no one ever has to reinstall the
  PWA**; 0009's and 0015's origin-migration warnings are moot here.
- After 24 October 2026 the app shows a finished 2026 Schedule indefinitely. Ruled out of
  scope on the map.
