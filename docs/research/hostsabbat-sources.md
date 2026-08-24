# Høstsabbat programme sources — survey

- **Date:** 2026-08-24
- **Ticket:** https://github.com/prudentmildew/fuzztid/issues/7
- **Method:** every claim below was fetched directly with `curl` on the date above. HTTP statuses are quoted where a fetch failed. Scratch copies of every response live outside the repo.

Already established before this survey (not re-derived): 2026 runs 23–24 Oct; 2025 had three stages (The Chapel, The Crypt, Verkstedet); Broadcast exposes `GET https://demo.broadcastapp.no/api/v1/festivals?key=<widget-key>&festival=<id>` with ids `XIanfZspWO` (2026) and `dEoMHOghYt` (2025).

---

## 1. Per-artist pages on hostsabbat.no

**Finding:** Per-artist pages are plain Squarespace 7.1 *pages* (not collection items) containing only editorial prose and an image. No time, day or stage field exists in any form — and the pages only exist for the **2024** edition; 2025 and 2026 acts have no per-artist pages at all.

**Evidence**

- Sitemap (`https://hostsabbat.no/sitemap.xml` → 301 → `https://www.hostsabbat.no/sitemap.xml`, 200) lists 56 URLs. The 24 artist slugs are `barren-womb, buskas, dread-witch, eyes, feral-nature, hxer, inter-arma, jaqueline, kosmodome, law-of-all, monkey3, morpholith, nightstalker, pageni, purple-hill-witch, strange-horizon, sver, syn, the-body-dis-fig, tradgrasochstenar, tusmrke, uma, under-aapen-himmel, witchthroat-serpent`. All 24 are linked from `/2024` (the 2024 lineup page) and from nowhere else.
- Checked eight of them with `?format=json` (all 200): `/monkey3`, `/inter-arma`, `/nightstalker`, `/dread-witch`, `/kosmodome`, `/the-body-dis-fig`, `/tusmrke`, `/buskas`. Every response has the same shape:
  - top-level keys: `calendarView, collection, empty, emptyFolder, localizedStrings, mainContent, pagePreviewContext, shareButtons, shoppingCart, showCart, template, uiextensions, userAccountsContext, website, websiteSettings`
  - `collection`: `{"typeName": "page", "type": 10, "collectionType": null, "itemCount": 0, "folder": false}` (e.g. `/monkey3`: `{"id":"671147986139f16db26b5c3b","title":"Monkey3","urlId":"monkey3"}`)
  - **no `item` key**, no `startDate`/`endDate`, no `items` array, `calendarView: false`
  - `mainContent` is 143 bytes (an empty wrapper) — Squarespace 7.1 "fluid engine" sections are not serialised through `?format=json`.
- The rendered HTML (`/monkey3`, `/inter-arma`, `/nightstalker`, `/dread-witch`, `/kosmodome`, `/tusmrke`, all 200) contains one `website-component` block per page with a heading and a paragraph, e.g. `/inter-arma`: *"Inter Arma US-legends Inter Arma. With influences from black metal, sludge and postmetal the Richmond based pummeling maniacs …"*. No `<time>` elements, no `itemprop`, no `HH:MM` tokens, no stage or weekday keywords on any of the six.
- JSON-LD on artist pages is the site-wide `WebSite` object only: `{"@type":"WebSite","url":"https://www.hostsabbat.no","name":"Høstsabbat",…}`. `<meta name="description" content="">` is empty.
- `Static.SQUARESPACE_CONTEXT` in the HTML has `collection.type: 10` and no `item`.

**Implication for the app:** artist pages are useless for schedule data and can't even be relied on to exist for the current edition. At most they're a source of 2024 blurbs.

---

## 2. Squarespace collections

**Finding:** The site has exactly one non-page collection — the `NEWS` blog (`typeName: "blog-side-by-side"`, type 1). There is no Events/Calendar collection anywhere; every `calendarView` is `false`, no `startDate`/`endDate` appears in any response, and `?format=ical` returns HTML.

**Evidence**

- `https://www.hostsabbat.no/?format=json` (200): `collection: {"id":"659d453b48cf98126ff71407","title":"Home","typeName":"page","type":10,"urlId":"home"}`, `calendarView: false`. The `website` object has no `collections` array (7.1 sites don't expose the collection list here).
- Guessed collection URLs: `/events` → 404, `/calendar` → 404, `/schedule` → 404, `/program` → 404, `/lineup` → 200 but it is a **redirect to `/2024-1-1`** (the 2026 lineup page). `/events?format=ical` and `/calendar?format=ical` → 404; `/?format=ical` → 200 but returns the HTML home page, not iCalendar.
- Enumerated from the sitemap and nav, with `?format=json` results:

  | urlId | title | typeName | type | itemCount | notes |
  |---|---|---|---|---|---|
  | `home` | Home | page | 10 | 0 | |
  | `2024-1-1` | **2026** | page | 10 | 0 | HTML `<title>` is still "Line Up 2024"; hosts the Broadcast widget for `XIanfZspWO` |
  | `2024-1` | **2025** | page | 10 | 0 | same stale `<title>`; hosts the Broadcast widget for `dEoMHOghYt` |
  | `2024` | 2024 | page | 10 | 0 | 24 artist-page links + 24 images |
  | `previous-lineups` | Previous lineups | page | 10 | 0 | 12 poster images (2013–2025) |
  | `news` | NEWS | **blog-side-by-side** | 1 | 20 | 20 items, `pagination: null` |
  | `info`, `tickets`, `about-us`, `merch`, `media-art`, `newsletter`, 24 artist slugs | … | page | 10 | 0 | |

- Grep across every JSON response fetched: `typeName` values seen = `{page, blog-side-by-side}`; `calendarView` values = `{false}`; occurrences of `"startDate"` = 0.
- The `NEWS` items carry `publishOn`/`addedOn`/`updatedOn` (post timestamps), `body`, `tags`, `categories`, `location`, `excerpt` — a blog schema, not an event schema.
- Note: `https://www.hostsabbat.no/robots.txt` (200) is the standard Squarespace file and `Disallow`s `/*?format=json`, `/*?format=ical`, `/*?format=main-content` etc. for `User-agent: *`. So `?format=json` works but is explicitly not something the site wants crawled.

**Implication for the app:** there is no structured event source on hostsabbat.no. The `/news` blog is the only machine-readable collection, and it carries schedule info only as images/links inside post bodies.

---

## 3. The 2025 schedule PDF (and earlier years)

**Finding:** The PDF is a single flattened JPEG exported from Photoshop — zero fonts, zero text. `pdftotext` yields one character (a form feed). Not usable without OCR. Earlier years had no PDF at all; 2024's schedule was JPEGs only.

**Evidence**

- `https://drive.google.com/uc?export=download&id=1nAp6a2b2BcXRRpNoVJ894jNipMwvQq28` → 200 but returns a 2.4 KB HTML "Google Drive - Virus scan warning" page ("Google Drive can't scan this file for viruses… HS25-PDF SCHEDULE.pdf (4.8M)"). Adding `&confirm=t` via `https://drive.usercontent.google.com/download?id=…&export=download&confirm=t` → 200, `application/octet-stream`, 5,070,529 bytes, `%PDF-1.4`.
- `pdfinfo`: `Producer: Adobe Photoshop for Windows -- Image Conversion Plug-in`, `CreationDate: Mon Oct 20 09:13:28 2025 CEST`, `Pages: 1`, `Page size: 800.16 x 449.76 pts`.
- `pdffonts`: **no fonts listed**. `pdfimages -list`: one `image 1667x937 icc 3 8 jpeg` plus one `smask`. Raw scan: `/Type /Font` objects = 0, `/Subtype /Image` = 2.
- `pdftotext -layout` → exit 0, output is 1 byte (`\f`).
- Earlier years:
  - `/news/schedule` (published 2024-10-22, "Schedule!"): body is prose ("Get your pens and highlighters out…") plus three Squarespace CDN images `HS24_Schedule_FRIDAY_4x5_v01.jpg`, `HS24_Schedule_SATAURDAY_4x5_v01.jpg`, `Artboard+1.jpg`. No PDF, no Broadcast link.
  - `/news/nightstalker-m23pg` (2024-10-11, "Day split is finally here!"): one image `HS_daysplit_4x5+(1).jpg`.
  - `/news/schedules-2025` (2025-10-20, "SCHEDULE REVEAL"): prose *"Screenshot or save the images, or check out Broadcast where you'll get full overview of the program, info, playing times and stages. Scroll down to find a dual schedule image, seperate image files, and a PDF for you old-schoolers out there!"* — links to `https://www.broadcast.events/festival/dEoMHOghYt` and the Drive PDF; images `Scedule+IG2_FIXED.png`, `Scedule+FB-FIXED.png`, `Scedule+IG.jpg`.
  - The full `/news` feed (20 posts, oldest 2019) contains no other schedule/PDF posts. `/previous-lineups` is 12 poster images with no text beyond the year labels.

**Implication for the app:** the PDF and images are the same artefact — pixels. They're a human-readable fallback and a manual-verification aid, not a data source. Year-to-year the format has changed (2024: JPEG; 2025: JPEG + PDF + Broadcast), so nothing here is stable enough to automate.

---

## 4. Anywhere else (Ticketmaster, Songkick, Bandsintown, Facebook, iCal)

**Finding:** No other source carries times or stages. Ticketmaster has a single "festival pass" event with one `startDate` and the venue; Songkick, Bandsintown and Facebook all block unauthenticated fetches; hostsabbat.no publishes no `.ics`.

**Evidence**

- `https://www.ticketmaster.no/event/hstsabbat-2026-billetter/1443649456` → **401**, body `{"response":"identify"}` / "Let's Get Your Identity Verified … we need to make sure you're not a bot" (with a browser UA too).
- `https://www.ticketmaster.com/hstsabbat-tickets/artist/2819078` → 200 (this is the link the festival's own news posts use). JSON-LD present is only `BreadcrumbList` and `WebPage` — no `MusicEvent`. `__NEXT_DATA__` contains one event:
  `{"title":"HØSTSABBAT 2026 (FESTIVAL PASS)","id":"1443649456","discoveryId":"Z698xZb_Z16vod_aop","dates":{"startDate":"2026-10-23T13:30:00Z","onsaleDate":"2025-10-24T08:00:00Z","spanMultipleDays":false},"venue":{"name":"Kulturkirken Jakob","addressLineOne":"Hausmannsgate 14","latitude":59.91803,"longitude":10.75412},"timeZone":"Europe/Oslo","artists":[{"name":"Kulturkirken Jakob"},{"name":"Høstsabbat"}]}` — no acts, no stages.
- Discovery API `https://app.ticketmaster.com/discovery/v2/events.json?keyword=høstsabbat&countryCode=NO` → **401** `steps.oauth.v2.FailedToResolveAPIKey` (needs a registered key; and per the artist page the attraction has no per-act events anyway).
- `https://www.songkick.com/festivals/1795914-hostsabbat` and Songkick search → **406** with empty body on three header variants.
- `https://www.bandsintown.com/f/hostsabbat` → **403** Cloudflare "Sorry, you have been blocked".
- `https://www.facebook.com/hostsabbat/events` → **400** "Sorry, something went wrong" (login wall).
- iCal: no `.ics` link anywhere in the fetched HTML/JSON; `?format=ical` on `/`, `/events`, `/calendar` returns HTML/404 (see §2).

**Implication for the app:** none of these is a viable programme source. Ticketmaster is at best a confirmation of dates + venue and a ticket link, and even that requires scraping a page that is bot-walled on the `.no` domain.

---

## 5. Act count per edition

**Finding:** 24–25 acts per edition, stable across 2024–2026.

**Evidence**

- 2024: `/2024` HTML links to exactly **24** artist pages (the 24 slugs in §1).
- 2025: Broadcast feed `dEoMHOghYt` returns **25** entries — 24 bands plus "Hestedirektoratets Rockequiz" (Sat 13:00 The Chapel); YOB appears twice (both nights). Stages: `The Chapel`, `The Crypt`, `Verkstedet`. Slots are 60 min, staggered 14:00/14:30/15:00 across the three stages.
- 2026: Broadcast feed `XIanfZspWO` returns **24** entries as of today (Earthbong, Reaping Flesh, Feral Nature, Rosa Faenskap, Dune Sea, Voidspire, Sex Magick Wizards, Bogwife, Gloombound, The Ape, Bong Voyage, Henchlock, Monolord, Old Horn Tooth, Embla, Ruff Majik, Hippie Death Cult, Cult of Occult, Cult Member, Cult of Fire, Deathchant, Khemmis, The Vintage Caravan, Domkraft). **All 24 currently carry the placeholder slot `2026-10-23T13:00Z → 2026-10-23T23:00Z` and `externalVenueName: ""`** — the day split and stages aren't published yet (the 2025 schedule landed 2025-10-20, four days before the festival).
- `/previous-lineups` shows posters back to 2013 but no counts.

**Implication for the app:** a ~25-row programme, three stages, two days. Expect the real times to appear in Broadcast only days before the festival; the feed's `relatedEvent.custom_fields.ticketUrl` already points at Ticketmaster `1443649456`.

---

## 6. Broadcast legitimacy

**Finding:** Høstsabbat embeds Broadcast via Broadcast's official festival widget on its own lineup pages for both 2025 and 2026, and links to Broadcast by name in its schedule post. Broadcast AS publicly says it offers an API and widgets to organisers *and* to third-party "partners such as media, publishers and hotels", but publishes no public API docs, terms of use, or self-serve access — access is by contacting them. The key in the feed URL is hard-coded in Broadcast's own public `widget.js`; there is no per-site key.

**Evidence**

- Exact embed HTML on `https://www.hostsabbat.no/2024-1-1` (2026 page):

  ```html
  <div id="bc-widget" data-venue="XIanfZspWO " data-lang="en"></div>
  <link
      href="https://widgets.broadcast.events/v2/festivals/widget.css"
      rel="stylesheet"
  />
  <script
      src="https://widgets.broadcast.events/v2/festivals/widget.js"
      type="module"
  ></script>
  ```

  (note the trailing space inside `data-venue`). On `https://www.hostsabbat.no/2024-1` (2025 page): `<div id="bc-widget" data-venue="dEoMHOghYt" data-lang="en">` with the same `<link>`/`<script>`.
- `/news/schedules-2025` links `https://www.broadcast.events/festival/dEoMHOghYt` with the text "check out Broadcast where you'll get full overview of the program, info, playing times and stages"; the home page's featured post says "Access it on Broadcast or screenshot the images!".
- `https://widgets.broadcast.events/v2/festivals/widget.js` (200, 495 KB, MIT-licensed React bundle) contains the fetch verbatim:
  `` He.get(`https://demo.broadcastapp.no/api/v1/festivals?key=4f68363acfae4b098aec21c8a37d343a&festival=${V}`) `` — i.e. the key is a constant shipped to every browser that loads any Broadcast festival widget, not a credential issued to Høstsabbat. Without it: `https://demo.broadcastapp.no/api/v1/festivals?key=none&festival=dEoMHOghYt` → 400 `{"error":"Invalid request: Key and/or Festival ID missing or incorrect."}`.
- `https://www.broadcast.events/festival/dEoMHOghYt` (200) is a public page titled "Høstsabbat 2025 | broadcast.events" that renders client-side ("Loading…"); `https://www.broadcast.events/festival/XIanfZspWO` likewise. The 2025 feed's `relatedEvent.name` is "Høstsabbat", venue "Kulturkirken Jakob".
- Public docs/terms: `https://www.broadcast.events/api` → 404, `/docs` → 404, `/terms` → 404. `https://broadcastapp.no/` (and every path under it) → 301 to `https://www.facebook.com/broadcastoslo`. `https://api.broadcastapp.no/` → 200 "Elvis has left the building". `/privacy` and `/subprocessors` exist (privacy policy only; no usage terms). `/robots.txt`: `User-Agent: * / Allow: /`.
- `https://www.broadcast.events/faq` (200) — quoted: *"Broadcast offers an API that allows organisers to build websites directly on our platform - used by Rockefeller, Blå, USF, Oslo kulturnatt, and others. We also provide widgets for easy data syncing with most CMSs and websites … We also provide data access for partners such as media, publishers and hotels. These third parties can also use our API or widgets to display live events on their websites - including Lillebror, Bunks, Musikknyheter, TBA, and Ballade."* and *"How can I publish my events on Broadcast? We are currently working towards a self service solution … but until that is up and running, reach out to us via the chat or here, and we will give you access."*
- `https://www.broadcast.events/contact` (200): a contact form ("Got a question? Having problems with the app? Just wanna say hi?"). `/about`: "Broadcast AS", CEO/tech lead Tim Harris.

**Implication for the app:** the feed is exactly what the festival's own site loads in every visitor's browser, so reading it is not circumventing anything — but it is unambiguously Broadcast's infrastructure, and Broadcast's FAQ frames third-party data access as a partnership they grant on request. Treat it as a permission question: a short note via the contact form asking to use the festival feed for a free, unaffiliated Høstsabbat programme app is cheap, and the answer decides whether the app can call the endpoint live or must snapshot the data at build time. Either way, don't ship the widget key in a way that looks like an independent API client; mirror the widget's behaviour (same endpoint, `festival` id from the embed) or build a static snapshot.

---

## Summary table

| Source | Structured? | Has times | Has stage | Sanctioned / stable? | Verdict |
|---|---|---|---|---|---|
| Broadcast feed `demo.broadcastapp.no/api/v1/festivals?key=…&festival=…` | Yes — JSON, ISO + epoch `start_time`/`end_time`, `externalVenueName`, tags, socials, images | Yes (placeholder until schedule reveal) | Yes (`externalVenueName`) | Widget-key only; no public terms; FAQ says partners get access on request; festival officially embeds it for 2025 and 2026 | **Primary candidate — ask Broadcast; snapshot at build time as fallback** |
| hostsabbat.no artist pages (`/monkey3` etc.) | No — Squarespace `page`, prose only, 2024 edition only | No | No | Public, but `?format=json` is robots-disallowed | Not usable |
| hostsabbat.no collections (`?format=json`) | Only `NEWS` blog (`blog-side-by-side`); no events collection, `calendarView: false` | No | No | Same robots caveat | Not usable for schedule |
| hostsabbat.no `/news/schedules-2025` images + Drive PDF | No — JPEG/PNG and a Photoshop image-only PDF (0 fonts, 1 char of text) | Only as pixels | Only as pixels | Official, but format changed 2024→2025 | Human fallback / manual verification only |
| Ticketmaster artist page `ticketmaster.com/…/artist/2819078` | Partially — `__NEXT_DATA__` with one event (`startDate`, venue, address, coords) | Festival start only | No | Official ticket link; `.no` event page bot-walled (401); Discovery API needs key (401) | Dates + venue + ticket link only |
| Songkick / Bandsintown / Facebook | Unknown | Unknown | Unknown | 406 / 403 / 400 unauthenticated | Not fetchable; skip |
| `.ics` / calendar feed on hostsabbat.no | None exists (`?format=ical` → HTML/404) | — | — | — | Does not exist |
