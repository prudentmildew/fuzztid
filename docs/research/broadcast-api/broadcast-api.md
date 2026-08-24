# Broadcast programme API — research findings

Resolves the open part of [#6 "Reverse-engineer the Broadcast programme API"](https://github.com/prudentmildew/fuzztid/issues/6):
**whether we may** consume it, plus the residual access facts and captured payloads.
All live checks were made on **2026-08-24 (18:40–19:10 UTC)** with `curl`. Every claim
cites the URL it was read from. The embed key is written `<widget-key>` throughout; it is
visible in Broadcast's own festival web page at runtime (browser network log when
<https://www.broadcast.events/festival/XIanfZspWO> loads) and in the #6 issue comments.

## Summary and recommendation

- **Operator:** Broadcast AS, Oslo, org.nr 927 536 129. Contact: `support@broadcast.events`,
  `tim@broadcastoslo.no` (CEO/tech lead Tim Harris), or the form at
  <https://www.broadcast.events/contact>.
- **Programme owner:** the festival, Høstsabbat AS (org.nr 924 207 388), `post@hostsabbat.no`.
  Broadcast is the festival's SaaS publishing platform, not the author of the content.
- **Terms:** Broadcast publishes **no terms of service / terms of use** for the website, the
  app or the API — only a privacy policy and a subprocessor list. Nothing prohibits automated
  access in writing, and nothing permits it either.
- **robots.txt:** `www.broadcast.events` allows everything except `/discover/test`; the two
  API hosts have no `robots.txt` at all (404). No crawl-directive objection exists.
- **Official product exists:** Broadcast's FAQ says it "offers an API", "provide[s] widgets
  for easy data syncing with most CMSs and websites", and "provide[s] data access for
  partners such as media, publishers and hotels" who "can also use our API or widgets".
  The endpoint we found is that same widget/API surface, keyed with a per-integration key
  that Broadcast ships in public JavaScript by design.
- **Assessment:** the endpoint is public, CORS-open (`*`), edge-cached, tiny (35 KB), and
  Broadcast's own model is to hand this data to third parties. Consuming it is **not
  forbidden by anything Broadcast has published**, and the load a fan app adds is
  negligible. But we would be using a key issued to someone else's integration, from an
  undocumented host literally labelled "Demo use only" that has a `/deleteme-widget` route —
  so the practical risks (key rotation, host retirement, an origin allow-list, shape drift)
  are real and we would have no standing to complain.
- **Recommended route (one):** **ask Broadcast for partner data access for the two Høstsabbat
  festival ids, with the festival's blessing.** Concretely: email `support@broadcast.events`
  (cc `post@hostsabbat.no`, or ask the festival to make the introduction) requesting a
  read-only key of our own for `GET /api/v1/festivals?festival={id}` (or whatever they
  consider the supported equivalent), confirmation that a non-commercial fan app may
  redisplay names, times, stages, descriptions, tags and ImageKit images with a link back
  to Broadcast, and a heads-up channel for breaking changes. Meanwhile, build the transform
  against the **captured fixtures in this directory** (zero live calls), and put the live
  fetch behind a **build-time snapshot** (a few fetches a day from CI, not one per visitor)
  so that even a sanctioned key stays server-side and the app keeps working if the
  endpoint disappears. Do not ship a public deploy on the lifted key.

## Endpoints

All three respond `200 application/json` to a bare `curl` with no `Origin`, `Referer`,
cookies or auth. Requests were made with and without `Accept: application/json`, with a
foreign `Origin: https://example.com` + `Referer`, and with an iPhone Safari user agent —
identical responses in every combination.

| purpose | request | notes |
|---|---|---|
| **Programme** (acts, times, stages) | `GET https://demo.broadcastapp.no/api/v1/festivals?key=<widget-key>&festival={festivalId}` | `key` required — omit it and you get `400 {"error":"Invalid request: Key and/or Festival ID missing or incorrect."}` (from #6). Flat JSON array of acts. 34 943 B (2025) / 34 008 B (2026). |
| **Config** | `GET https://api.broadcastapp.no/v1/public/festival/config?id={festivalId}` | Small blob: `name`, window, `ticketLink`, `region`, `country` (2026 only), `dateDisplayType`. 359 B / 365 B. Vercel reports `x-matched-path: /api/v1/public/festival/config`, so the host strips a leading `/api`. |
| **Metadata + stages** | `GET https://www.broadcast.events/api/v1/festivals/{festivalId}` | `useStages`, `stages[]`, `appConfig`, ImageKit refs, Parse pointers. 4 492 B / 3 342 B. **No CORS headers at all** — see below. |

Festival ids: `dEoMHOghYt` (Høstsabbat 2025) and `XIanfZspWO` (Høstsabbat 2026), from
<https://www.broadcast.events/festival/XIanfZspWO> and the #6 comments.

## Act shape (programme endpoint, one array element)

Verified against `programme-2025-dEoMHOghYt.json` in this directory.

| field | type / example | note |
|---|---|---|
| `objectId` | `"AuYNElzODS"` | Parse object id — the act identity (Favourites key) |
| `name` | `"Crouch"` | artist |
| `start_time` / `end_time` | `1761314400` | unix seconds |
| `start_time_iso` / `end_time_iso` | `"2025-10-24T14:00:00.000Z"` | UTC ISO |
| `externalVenueName` | `"The Crypt"` | **the stage**; `""` on every 2026 act today |
| `isMainSchedule` | `true` | schedule-inclusion flag; `true` on all 49 acts seen |
| `description` | string | free text, may contain Unicode styling |
| `imageUrl` | `https://ik.imagekit.io/mfgbmrqfuvo/schedule-images/...` | ImageKit; accepts ImageKit transform params |
| `socialLinks[]` | `[{type:"spotify"\|"tidal"\|"instagram"\|"facebook", url}]` | |
| `tags[]` | `["Sludge","Post-Metal","Doom"]` | genres |
| `youTube` | `"Ny1sZ6nrM2I"` | video id or `""` |
| `relatedEvent` | object | Parse `events` object: `objectId`, `name` ("Høstsabbat"), `venue.name` ("Kulturkirken Jakob"), `custom_fields.ticketUrl` |
| `createdAt` / `updatedAt` | ISO | Parse timestamps |

Full key list per act: `createdAt, description, end_time, end_time_iso, externalVenueName,
imageUrl, isMainSchedule, name, objectId, relatedEvent, socialLinks, start_time,
start_time_iso, tags, updatedAt, youTube`.

## Access facts (B)

Recorded 2026-08-24 from `curl -sSi`. Hosting is Vercel for all three hosts (`server: Vercel`,
`x-vercel-id: arn1::fra1::…` — Stockholm edge, Frankfurt origin).

| header | programme (`demo.broadcastapp.no`) | config (`api.broadcastapp.no`) | metadata (`www.broadcast.events`) |
|---|---|---|---|
| `access-control-allow-origin` | `*` | `*` | **absent** |
| `access-control-allow-methods` | `GET` | `GET, POST, PUT, DELETE, OPTIONS` | absent |
| `access-control-allow-credentials` | `true` | `true` | absent |
| `access-control-allow-headers` | `X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version` | same | absent |
| `cache-control` | `public, max-age=0, must-revalidate` | same | same |
| `etag` | yes (`"yeu0ois1cxqw9"` for 2025) | yes | **no** |
| `last-modified` | no | no | no |
| `age` / `x-vercel-cache` | `671` / `STALE` | `672` / `STALE` | `72` / `STALE` |
| `x-matched-path` | `/api/v1/festivals` | `/api/v1/public/festival/config` | `/api/v1/festivals/[id]` |
| `vary` | none | none | `RSC, Next-Router-State-Tree, Next-Router-Prefetch` |
| `x-powered-by` | absent | absent | absent (the HTML pages send `x-powered-by: Next.js`) |
| rate-limit headers | none | none | none |
| API version header | none (the `/api/v1/` path segment is the only versioning; the allow-list mentions `Accept-Version` / `X-Api-Version` but nothing was returned) | none | none |

Observations:

- **CORS:** programme and config are fully open (`*`), and an `OPTIONS` preflight from
  `https://example.com` returns `200` with the same headers, so a browser on any origin can
  call them. The **metadata endpoint sends no CORS headers**, so a browser-side fetch from a
  fan-app origin will be blocked by the browser even though `curl` succeeds. That
  qualifies the #6 note "no key or origin lock observed" for that endpoint: there is no
  lock, but there is also no cross-origin *permission*. If `stages[]` is needed it must be
  fetched server-side/at build time — or derived from `externalVenueName` in the programme.
- **Caching:** `max-age=0, must-revalidate` for clients, but Vercel's edge serves it
  stale-while-revalidate (`age` in the hundreds of seconds, `x-vercel-cache: STALE`/`HIT`).
  Repeated reads are cheap for Broadcast; the ETag on programme/config allows
  `If-None-Match` revalidation.
- **Origin/Referer/UA:** no effect. `Accept: application/json` alone: works. Mobile UA:
  works. Foreign `Origin`: works and is echoed as `*`.
- **Old editions stay retrievable:** `dEoMHOghYt` (2025) returned the full 25-act programme,
  its metadata and config on 2026-08-24, ten months after the festival.
- The demo host's index page reads "Demo use only. Nothing to see here... move along!"
  (<https://demo.broadcastapp.no/>, `title: Demo`, `description: Generated by create next
  app`), and its build manifest exposes routes `/deleteme-thehub`, `/deleteme-widget`,
  `/deleteme-widget/{experiment,layoutOld,storgata,subjekt}`
  (<https://demo.broadcastapp.no/_next/static/2ofNLSC_kSebuNMhhxuaC/_buildManifest.js>).
  It is nonetheless the production data path for Broadcast's own festival page *and* for
  the official website widget (below).
- `www.broadcastapp.no` is not a site: it `301`s to <https://www.facebook.com/broadcastoslo>
  (checked via `/robots.txt`).

## 2026 status as of 2026-08-24

Unchanged from the #6 comment of earlier this month:

- Programme `XIanfZspWO`: **24 acts, 24 unique `objectId`s**, all `isMainSchedule: true`,
  **`externalVenueName` is `""` on all 24**, and **all 24 share the same
  `start_time_iso` `2026-10-23T13:00:00.000Z`** — the times are placeholders, not a
  provisional running order.
- Metadata: `useStages: false`, no `stages[]`, no `isLineupPublished`, `published: true`,
  `updatedAt: 2026-08-06T09:04:08.009Z`. The 2026 record was created 2026-08-06.
- Config: window `2026-10-23T08:00Z → 2026-10-24T21:59Z`, `ticketLink`
  <https://www.ticketmaster.no/event/hstsabbat-2026-billetter/1443649456>, `dateDisplayType: 2`
  (2025 had `0`), `country: "Norway"` (absent on 2025).
- Watch for: `useStages` → `true`, `stages[]` appearing, `externalVenueName` filling in, and
  the acts spreading across 2026-10-23 and -24 with distinct times. In 2025 the schedule was
  revealed on 20 October (<https://www.hostsabbat.no/news/schedules-2025>), four days before
  the festival.

## Whether we may (A)

### 1. Who operates Broadcast

- Footer on every page: "© 2026 Broadcast AS. All Rights Reserved."
  (<https://www.broadcast.events/>).
- Team: Tim Harris (CEO, in-house tech lead), Stine Mari Røverdatter (Board Chair, CFO),
  Håvard Haga (CMO) — <https://www.broadcast.events/about>.
- App Store: seller "Broadcast AS", bundle id `com.linearshift.broadcastoslo`, seller URL
  <https://broadcast.events/>, app "Broadcast: Find live music" v1.18.0 (2026-08-08) —
  <https://apps.apple.com/no/app/broadcast-find-live-music/id1466483301>; developer page
  <https://apps.apple.com/no/developer/broadcast-as/id1564285730>. Its listed privacy URL
  <https://broadcastoslo.no/privacy> `308`s to <https://www.broadcast.events/privacy>.
- Google Play: "Broadcast Events" by Broadcast AS, 10K+ downloads, updated 2026-08-08,
  developer contact **`tim@broadcastoslo.no`**, support **`support@broadcast.events`** —
  <https://play.google.com/store/apps/details?id=com.linearshift.broadcastoslo>.
- Brønnøysundregistrene: **BROADCAST AS, org.nr 927 536 129**, AS, Thorvald Meyers gate 85L,
  0550 Oslo, NACE 62.100 "Dataprogrammeringstjenester", founded 2021-07-01 —
  <https://data.brreg.no/enhetsregisteret/api/enheter/927536129>. (The site itself shows no
  org number.)
- Contact page is a form only, no address —
  <https://www.broadcast.events/contact>. Social: facebook.com/broadcasteventsapp,
  instagram.com/broadcast.events.

### 2. Terms of service / privacy

- The footer's "Legal" section contains exactly two items: **Privacy** and
  **Subprocessors** (<https://www.broadcast.events/>). `/terms`, `/terms-of-service`,
  `/terms-of-use`, `/tos`, `/legal`, `/eula` all return `404` (checked 2026-08-24).
  **There are no published terms of service or terms of use** for the website, the apps or
  the API, and the app-store listings link only to the privacy policy.
- Privacy policy (<https://www.broadcast.events/privacy>) is a generic app privacy notice.
  The only clauses touching use of the service:
  > "The Broadcast website and associated apps are provided by Broadcast AS at no cost and
  > are intended for use as is."
  >
  > "If you choose to use the Broadcast website and associated apps, then you agree to the
  > collection and use of information in relation to this policy."
  Nothing about automated access, scraping, API use, licensing, or reuse of event/festival
  content.
- Subprocessors (<https://www.broadcast.events/subprocessors>): Vercel (hosting), **Back4App
  (database hosting — a hosted Parse, which matches the Parse-shaped payloads)**, ImageKit,
  Tinybird, Upstash, Plausible, Campaign Monitor, SendGrid, Algolia, Intercom, EAS.
- The festival's site (<https://www.hostsabbat.no/>) has no terms page either; its
  Squarespace `robots.txt` is the only policy text (see 3).

### 3. robots.txt

`https://www.broadcast.events/robots.txt` — `200 text/plain`:

```
User-Agent: *
Allow: /
Disallow: /discover/test

Sitemap: https://broadcast.events/sitemap.xml
```

`https://demo.broadcastapp.no/robots.txt` — **`404`** (Next.js "This page could not be
found"), i.e. no robots policy on the programme host.

`https://api.broadcastapp.no/robots.txt` — **`404`** (same Next.js 404 page).

`https://www.broadcastapp.no/robots.txt` — `301` to
`https://www.facebook.com/broadcastoslorobots.txt` (the whole host is a redirect to
Facebook).

For completeness, `https://www.hostsabbat.no/robots.txt` is Squarespace's stock file: it
lists ~30 AI crawler user agents (`GPTBot`, `ClaudeBot`, `anthropic-ai`, `CCBot`, …) with
`Disallow: /` implied by the block, and for `User-agent: *` disallows `/config`, `/search`,
`/account`, `/api/`, `/static/` and query-string variants (`?format=json`, `?tag=`, …).
This governs hostsabbat.no, which the app does not scrape; it is irrelevant to Broadcast.

### 4. Is there an official embed/widget product?

Yes — stated by Broadcast itself, and confirmed in the wild.

- FAQ, "What is the Broadcast business model?" (<https://www.broadcast.events/faq>):
  > "For organisers, Broadcast offers a powerful SaaS platform with tools that simplify
  > event publishing and improve visibility, with monthly subscription options for the
  > event organisers. Once an event is added to our ecosystem, it's automatically
  > syndicated across all connected platforms, maximising reach with minimal effort."
  >
  > "Broadcast offers an API that allows organisers to build websites directly on our
  > platform - used by Rockefeller, Blå, USF, Oslo kulturnatt, and others. We also provide
  > widgets for easy data syncing with most CMSs and websites, as used by venues like Salt
  > and Revolver."
  >
  > "We also provide data access for partners such as media, publishers and hotels. These
  > third parties can also use our API or widgets to display live events on their websites
  > - including Lillebror, Bunks, Musikknyheter, TBA, and Ballade."
- FAQ, "How can I publish my events on Broadcast?":
  > "We are currently working towards a self service solution so that you can sign up and
  > start adding in your events, and even configure your own widget for easy sync with
  > your website plus a lot more tools and analytics, but until that is up and running,
  > reach out to us via the chat or here, and we will give you access."
- The widget in the wild: <https://www.tbatba.no/det-skjer-broadcast/> embeds
  `<div id="bc-widget" data-venue="tbatba" data-key="" data-limit="96" …>` plus
  `<script src="https://widget.broadcast.events/v1/eventfeed/index.js">`. That script
  (523 KB, `access-control-allow-origin: *`, last modified 2026-08-11) reads
  `dataset.key` (default `"none"`) and calls
  `https://demo.broadcastapp.no/api/layoutWidgetCors?limit=…&venue=…&recommended=…` — the
  **same demo host** as our programme endpoint — and also contains a hard-coded call to
  `https://demo.broadcastapp.no/api/v1/musikkfest?key=<another 64-char key>`. So Broadcast's
  own pattern is: per-integration keys, embedded in public client-side JavaScript, hitting
  `demo.broadcastapp.no`. Our `<widget-key>` is one of those, used by Broadcast's own
  festival page.
- No public developer documentation, pricing page or self-serve signup exists for the API
  or widget as of today; access is "reach out to us … and we will give you access" (FAQ).
- Implication: the festival *could* legitimately put the programme on hostsabbat.no via
  Broadcast's widget (it is a paying organiser on the platform, and the 2025 schedule post
  already points fans to Broadcast). That does not by itself license a third party to use
  the festival page's key — but it shows the data is meant to leave Broadcast's own
  surfaces, and that "partner data access" is a thing Broadcast grants on request.

### 5. Who owns the programme content

- The festival is run by **Høstsabbat AS** (org.nr 924 207 388, Maridalsveien 237A, 0467
  Oslo, website www.hostsabbat.no, founded 2019-12-01) —
  <https://data.brreg.no/enhetsregisteret/api/enheter/924207388>. An older association
  HØSTSABBAT (FLI, org.nr 920 030 386, 2017) also exists.
- Contact: **General `post@hostsabbat.no`**, Booking `booking@hostsabbat.no` —
  <https://www.hostsabbat.no/info>. The site is Squarespace; there is no organiser name or
  org number in the footer, only "About us": "Høstsabbat is brought to life by people
  involved in the underground music scene in Oslo, Norway. Since the start in 2013 …" —
  <https://www.hostsabbat.no/about-us>. News posts are signed "Preben Astrup"
  (<https://www.hostsabbat.no/news/schedules-2025>).
- The programme (band names, times, stages, blurbs, images) is the festival's editorial
  content, entered into Broadcast's platform; Broadcast's FAQ describes itself as the
  publishing/syndication layer for "the organisers who actually create and promote live
  events". The 2025 schedule was published by the festival itself as images and a PDF on
  hostsabbat.no alongside the Broadcast link — <https://www.hostsabbat.no/news/schedules-2025>:
  > "Screenshot or save the images, or check out Broadcast where you'll get full overview
  > of the program, info, playing times and stages."
  Artist images come from ImageKit under Broadcast's account
  (`ik.imagekit.io/mfgbmrqfuvo/…`); the underlying photos are presumably the bands'.
- Broadcast's own site claims "© 2026 Broadcast AS. All Rights Reserved." on its pages, but
  publishes no licence statement about event data either way.

### 6. Assessment

**Is it defensible?** Legally: there is no ToS to breach, no robots directive against it,
the endpoint is deliberately CORS-open, and the operator's stated business is syndicating
exactly this data to third-party websites. A non-commercial fan app that redisplays a
festival's public programme with a link back is squarely the kind of reuse Broadcast says
it supports. Ethically it is greyer: the key was lifted from Broadcast's own page rather
than granted, and the host is one Broadcast labels "demo". Nobody has said yes.

**Concrete risks, in order of likelihood:**

1. **Key rotation or revocation.** The key is not ours; Broadcast can rotate it any time
   (e.g. when it ships the self-serve widget the FAQ promises). The app goes dark with no
   notice. Mitigation: build-time snapshot committed/cached, so a dead key degrades to a
   stale programme rather than an empty app.
2. **Host retirement.** `demo.broadcastapp.no` advertises itself as a demo with `deleteme-*`
   routes. A rename to a real host would break us the same way.
3. **Origin allow-list or referer check added later.** Currently `*`; the header set already
   contains the machinery (`X-Api-Version`, `Accept-Version`) to tighten. Same mitigation as 1.
4. **Shape drift.** Undocumented; no version header; Parse-backed so new fields appear
   silently. Mitigation: validate against fixtures at build time and fail loudly.
5. **Being a burden.** Negligible: 35 KB, edge-cached with stale-while-revalidate, and a
   snapshot approach means single-digit requests per day regardless of traffic. A
   per-visitor client fetch on GitHub Pages would still be tiny, but it also exposes the
   key in our bundle, which is the one thing that could annoy Broadcast.
6. **Content rights.** The festival owns its programme; band photos have their own
   photographers. Redisplaying names/times/stages is uncontroversial; hot-linking ImageKit
   images and reprinting full descriptions is the part to get an explicit yes on.
7. **Relationship risk.** Høstsabbat is a small, volunteer-driven festival and Broadcast is
   a three-person company; both are reachable by email. A fan app they know about is an
   asset to both; one they discover from their logs is a support ticket.

**Is asking the better route?** Yes, and it is cheap. Both parties publish contact
addresses, Broadcast's FAQ literally invites "reach out … and we will give you access",
and the ask is small. What to ask for (one email, festival cc'd or endorsing):

- a read-only key of our own for the festival programme endpoint for the Høstsabbat
  festival ids (or Broadcast's preferred supported equivalent — the widget, or the
  `/api/v1/festivals/{id}` metadata endpoint gaining CORS);
- permission for a free, unaffiliated fan app to redisplay the programme (names, times,
  stages, tags, descriptions, images via ImageKit) with attribution and a link to the
  festival on Broadcast;
- a way to hear about breaking changes (an email is enough);
- from the festival: a simple "fine by us", and whether they want a link/credit on the app.

**Recommendation:** ask Broadcast (with the festival's blessing) for sanctioned access;
develop against the fixtures here in the meantime; fetch at build time, not per visitor;
launch publicly only once there is a yes — or once Broadcast says the public endpoint is
fine to use as-is, which, given the FAQ, is a plausible answer.

## Open risks / follow-ups

- No reply yet from Broadcast or the festival — the ask above has not been sent; that is a
  human step, tracked in "Choose the Programme source" (#8).
- The metadata endpoint's missing CORS means `stages[]` cannot be read from the browser;
  decide in #8 whether stages come from `externalVenueName` (programme) or a build-time
  fetch of metadata.
- 2026 times are placeholders (all `13:00Z`); the transform must not treat them as a
  running order until `useStages` flips and times diverge.
- The key location on Broadcast's page is a lazily-loaded chunk: it is in none of the 28
  chunks statically referenced by `/festival/{id}` (checked 2026-08-24), only observable
  in the network log. If it moves to a server-side proxy, the endpoint may stop being
  callable from outside at all.

## Files in this directory

| file | source |
|---|---|
| `programme-2025-dEoMHOghYt.json` | `GET https://demo.broadcastapp.no/api/v1/festivals?key=<widget-key>&festival=dEoMHOghYt` |
| `programme-2026-XIanfZspWO.json` | `GET https://demo.broadcastapp.no/api/v1/festivals?key=<widget-key>&festival=XIanfZspWO` |
| `metadata-2025-dEoMHOghYt.json` | `GET https://www.broadcast.events/api/v1/festivals/dEoMHOghYt` |
| `metadata-2026-XIanfZspWO.json` | `GET https://www.broadcast.events/api/v1/festivals/XIanfZspWO` |
| `config-2025-dEoMHOghYt.json` | `GET https://api.broadcastapp.no/v1/public/festival/config?id=dEoMHOghYt` |
| `config-2026-XIanfZspWO.json` | `GET https://api.broadcastapp.no/v1/public/festival/config?id=XIanfZspWO` |

All captured 2026-08-24, pretty-printed with 2-space indent, otherwise unmodified.
