---
status: accepted
---

# The navigation route: a two-second race with a precache-only fallback

_New decision, original to Høstsabbat. **Amends** Øyablikk's
[0013](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0013-service-worker-silent-auto-update.md)
(service worker with silent auto-update): the silent update, the custom `injectManifest`
worker and the absence of `skipWaiting`/`clientsClaim` all stand unchanged; what changes is
the fallback chain, which loses its middle hop, and with it the `NetworkFirst` strategy
itself. Discharges the tuning left open by
[#3](https://github.com/prudentmildew/fuzztid/issues/3)'s port-by-reference of 0013 and
revises its PWA dependency count. Leaves
[0011](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0011-no-third-party-requests-self-hosted-assets.md)
standing — the worker still caches first-party assets only. Decided in
[#16](https://github.com/prudentmildew/fuzztid/issues/16)._

0013 gives the navigation document a three-hop chain: **live network → last document seen
online (a `NetworkFirst` runtime cache) → the precached shell**, with a 3-second network
timeout. It was written for four days in an open park, against a nightly content cron.

Høstsabbat is two days inside Kulturkirken Jakob, a stone church, against an **hourly**
October cron ([0023](./0023-broadcast-feed-as-programme-source.md) §2). The timeout path
stops being the exception and becomes the common case, which makes the middle hop worth
examining rather than porting.

## Decisions

1. **The schedule stays inlined in the JS bundle.** `main.ts` imports
   `../data/schedule.json`, so Vite inlines it into `index-<hash>.js` and
   `data/schedule.json` never reaches `dist/`. The ticket's question — does the precache
   cover the schedule data or only the shell — therefore has no separate answer: the shell
   *is* the data. Emitting the schedule as its own asset, excluded from precache and served
   by its own runtime route, was measured and rejected: it would cut a data-only redeploy
   from ~12 KB gzipped to ~1.3 KB, but buys that ~10 KB with an async boot, a loading state,
   a failure path, and a staleness skew where the shell and the programme can come from
   different deploys. **One hash means the two can never disagree**, and atomicity is worth
   more here than the bytes.

   _Noted 2026-08-25, in review of [#29](https://github.com/prudentmildew/fuzztid/issues/29):
   `main.ts` now top-level-`await`s the debug switch, so the boot is async in form. In a
   production build the promise resolves at once with the schedule inlined as above, and
   none of the four costs this paragraph names — a loading state, a failure path, a
   staleness skew, a second hash — arises. The decision stands as written._

2. **The runtime document cache is deleted.** It is either redundant or harmful, and never
   anything else:

   - Cached document from the **same** deploy as the precache → the precache already holds
     a byte-identical `index.html`. Redundant.
   - From a **newer** deploy → it names exactly the bundle hash the active worker has *not*
     precached. And because `fetchAndCachePut` has already written it, every subsequent
     launch re-serves that document and re-fails on the same unfetchable bundle. Sticky.

   The precached pair — `index.html` and its bundle — is always coherent, because both come
   from one manifest generation. So the middle hop's only distinct contribution is a failure
   mode. The chain becomes **network → precached shell**.

3. **`NetworkFirst` goes with it, and two dependencies with that.** The strategy cannot
   express this chain: with an empty runtime cache its timeout is silently inert —
   `_getTimeoutPromise` resolves to `undefined` on a cache miss, and
   `Promise.race(promises) || (await networkPromise)` then waits unbounded. The route is a
   plain race instead:

   ```ts
   registerRoute(
     ({ request }) => request.mode === "navigate",
     async ({ request }) => {
       const networked = await Promise.race([
         fetch(request).catch(() => undefined),
         new Promise<undefined>((resolve) => setTimeout(resolve, 2_000)),
       ]);
       if (networked?.ok) return networked;
       return (await matchPrecache("index.html")) ?? networked ?? Response.error();
     },
   );
   ```

   `workbox-strategies` and `workbox-cacheable-response` are imported only by `sw.ts` and
   only for the deleted cache, so both leave `package.json`. `workbox-precaching`,
   `workbox-routing` and `workbox-window` stay. This also **corrects an off-by-one** in
   `CLAUDE.md`: the PWA dependencies were six, not five (`vite-plugin-pwa` plus *five*
   `workbox-*`), on twelve devDependencies. After this decision they are four, on ten.

4. **Two seconds, not three.** The cost of timing out is now an instant, complete, coherent
   app that may be one deploy stale. The cost of waiting is a blank screen at the exact
   moment someone is checking who is on next. The document is ~750 bytes gzipped, so this
   is time-to-first-byte, not bandwidth: 1 s would lose the foreground refresh on most
   church connections, 3 s holds the blank screen on every bad-signal launch, and past ~2 s
   the network is effectively down — where waiting buys nothing the update cycle will not
   deliver anyway.

5. **`og.png` leaves the precache glob.** Øyablikk precaches 12 entries totalling 161 KB
   raw. `og.png` is 42 KB of that — **26 %** — and appears only as
   `<meta property="og:image">`, an absolute URL the page never fetches; it is read by
   crawlers, server-side. Nothing else in the glob is cut: the install icons
   (192/512/maskable/apple-touch, ~41 KB) are what make an installed app look installed,
   they are stable across deploys so they cost nothing after the first fetch, and the church
   is exactly where someone installs after the app has already loaded.

6. **0013's silent update stands, and nothing is added to hurry it.** No `skipWaiting`, no
   `clientsClaim`, no periodic `registerSW` update check. Freshness on bad signal rides the
   **background soft update**, which the spec fires after every navigation handled by a
   worker, and which is untimed and unthrottled: `registerSW` never passes
   `updateViaCache`, so it defaults to `"imports"` and the top-level `sw.js` is always
   fetched past the HTTP cache — GitHub Pages' `max-age=14400` on it is therefore inert.
   Nothing may ever set `updateViaCache: "all"`, which would put a **4-hour** throttle on
   content freshness across a two-day festival.

## Considered options

- **Split the schedule out of the bundle** (decision 1). Rejected on measurement: ~10 KB
  gzipped per deploy, against an async boot and a shell/data skew.
- **Inline the JS and CSS into `index.html`** so the document *is* the app and the split
  between them cannot arise. Rejected: it needs either a new build dependency or a
  hand-rolled Vite plugin, `virtual:pwa-register` dynamically imports `workbox-window` as a
  separate chunk which does not inline cleanly, and it would re-fetch ~6 KB gzipped of code
  on every online launch that the precache currently serves for free. Decision 2 removes
  the failure mode it was aimed at, more cheaply.
- **Keep the runtime cache and guarantee its post-timeout write.** `NetworkFirst` does not
  cancel the network on timeout, but nothing extends the `FetchEvent` past it —
  `StrategyHandler.waitUntil` only pushes to an internal list, `Strategy.handle()` discards
  the `handlerDone` promise, and workbox-routing's fetch listener calls only
  `event.respondWith`. Calling `handleAll()` and passing the second promise to
  `event.waitUntil` would have closed that gap in two lines. Rejected once decision 2
  landed: it is a guarantee for a cache that should not exist.
- **`skipWaiting` for a two-day festival.** Rejected: it would not reload anything — the
  running page keeps the bundle it has already loaded — so it changes only which
  *navigation* picks up the new worker, while risking a new precache served to an old page.
  0013's rejection holds at two days.
- **A periodic `registerSW` update check.** Rejected: ~4 lines that pay off only when the
  app stays open longer than the gap between deploys and is then cold-launched shortly
  after — a window the per-navigation soft update already covers, and one mobile browsers
  close anyway by freezing backgrounded tabs. It does not shorten the bad-signal bound.
- **Cutting the install icons from the precache too**, taking it to ~78 KB. Rejected as
  cosmetic risk for bytes that are fetched once and never again.

## Consequences

- **Bad-signal staleness is bounded by one launch interval, not by the cron.** A deploy at
  14:30 with a 2-second timeout at 14:40 serves the coherent precached shell *and* installs
  the new worker in the background; the launch at 15:00 activates it. On good signal the
  new document and its not-yet-precached bundle both come off the network on the first
  launch, so the change is visible immediately.
- The fallback is never a mixed deploy. Whatever the worker serves offline, the document and
  its bundle are from the same build.
- A slow-but-successful response is now discarded rather than kept for the next launch. This
  is the price of decision 2, and the soft update covers it.
- Øyablikk's `service-worker.test.ts` ports with its `NetworkFirst` and `oya-document`
  assertions **replaced** — the guard becomes "the navigation route races a bounded timer
  and falls back to `matchPrecache("index.html")`", plus the surviving 0013 assertions (no
  `skipWaiting`, no `clientsClaim`, `registerType: "prompt"`, no `onNeedRefresh`). A new
  assertion earns its place: `updateViaCache` is never set to `"all"` (decision 6).
- The two-config typecheck split is untouched: `src/sw.ts` still exists and still needs
  `tsconfig.worker.json`.
