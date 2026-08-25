# fuzztid — the Høstsabbat programme app

A mobile web app showing the Høstsabbat programme: doom, stoner and occult rock across
three rooms of Kulturkirken Jakob, Oslo, over two days in October. One screen — two Days,
Stages as columns, a Now line at the current Oslo time, and tap-to-star Favourites.
Installable and offline-capable. Adapted from [Øyablikk](https://oyablikk.no)
(`prudentmildew/oyablikk`), itself adapted from Tons o'Clock; `docs/adr/` carries that
lineage decision by decision. This file is the vocabulary.

## Language

**Festival**:
Høstsabbat — doom, stoner and occult rock in Kulturkirken Jakob, Oslo. The app targets
the 2026 **Edition**, 23–24 October.

**Edition**:
One year's instance of the **Festival**. Everything the app scopes belongs to a single
Edition — its Days, its Stages, its Act ids and therefore its Favourites — and none of it
carries across to the next.
_Avoid_: year, instance, run

**Edition config**:
The facts that change between **Editions** and nothing else: which Edition, its **Days**,
and its **Stages** in display order.
_Avoid_: festival config, settings

**Lineup**:
The **Edition**'s confirmed **Artists**, with no times and no **Stages**. What the Festival
publishes for most of the year, and what the source carries before the **Reveal**.
_Avoid_: bill, roster, programme

**Programme**:
The **Edition**'s **Acts** with their times and **Stages**, as the source publishes them.
The pipeline's input; the **Schedule** is its output. Before the **Reveal** there is no
Programme — only a **Lineup**.
_Avoid_: schedule, running order

**Programme act**:
The **Programme**'s unit: one performance in Oslo wall-clock time, named, timed and placed
on a **Stage**, but not yet checked against the **Edition config**. Becomes an **Act**.
_Avoid_: performance, entry

**Reveal**:
The moment the **Festival** publishes the **Programme**'s times and **Stages** —
historically about four days before the Festival. Before it, the source carries the
**Lineup** on placeholder slots.
_Avoid_: launch, release

**Published**:
The **Programme**'s state once every **Act** has a **Stage**. A source where no Act has a
Stage is not yet published; one where only some do is a partial **Reveal**, which is an
error.

**Day**:
One programme date. The **Schedule** shows one Day's **Acts** at a time. Acts never cross
midnight, so a Day is also a closed daily envelope.

**Day standing**:
A **Day**'s relation to the real-world Oslo date — `past`, `today` or `future` — plus
`none`, the whole-app state when no Day is today, which is most of the year.
_Avoid_: relative day, day offset, recency

**Day switcher**:
The control that chooses which **Day** the **Schedule** shows, and the carrier of
today-ness: one tab per Day, with the tab that is today marked, and nothing marked under
standing `none`.
_Avoid_: day tabs, day picker, swipe nudge

**Stage**:
A performance room, and a column in the **Schedule**. Three exist — **The Chapel**, **The
Crypt** and **Verkstedet** — all inside Kulturkirken Jakob, so no Stage is more than a
staircase from any other. The columns are shared across both **Days**.
_Avoid_: room, venue, scene

**Accent**:
The palette's one chromatic mark, an ember red. It means exactly two things — the **Now
line**, and a **Favourite** — and there are no per-**Stage** colours competing with it.
_Avoid_: highlight, primary, brand colour, stage colour

**Act**:
A single **Artist**'s performance on one **Stage** over a bounded time window.
_Avoid_: slot, set, gig, performance

**Artist**:
The band or performer named in an **Act**. An Artist may play more than once in an
**Edition**, and each performance is its own Act.
_Avoid_: band, performer

**Favourite**:
A per-user mark on an **Act**, toggled by tapping the act block and persisted against the
Act's id. Keyed to the performance, not the **Artist** — an Artist playing twice is two
separate marks. A favourited Act is highlighted in place, never hidden, moved or dimmed.
_Avoid_: bookmark, saved, watchlist

**Focus**:
A transient view state that dims unstarred **Acts** so the **Favourites** stand out.
Toggled from the **Header**, never persisted — a glance, not a mode.
_Avoid_: dim mode, spotlight, favourites filter

**Schedule**:
The app's rendering of the **Programme**: one pane per **Day**, **Stages** as columns, time
down the y-axis. Also the on-disk artifact the pipeline writes and the app reads.

**Stage row**:
The strip naming the **Schedule**'s columns. Static as the **Day** changes — only the
**Acts** beneath it move.

**Header**:
The top band of the screen, carrying the wordmark (`fuzztid`, lowercase), the **Focus**
heart, and the ⓘ that opens **About**.

**About**:
The one-page bottom sheet behind the **Header**'s ⓘ: why the app exists, that it is an
unaffiliated fan project, the privacy statement, and how to add it to a home screen.
Purely informational — no options.
_Avoid_: settings, info sheet

**Now line**:
A horizontal indicator drawn across the **Day** pane at the current Oslo time-of-day,
visible whenever that time falls inside the **Festival**'s daily envelope and hidden
outside it — year-round, independent of the date. Its appearance follows the **Day
standing** of the pane in view.

**Offline**:
The app precaches its build in a service worker, so it opens with no signal inside a stone
church. Updates are silent: a newly deployed build activates on the next cold launch
rather than reloading mid-session.

**Analytics beacon**:
The single anonymous page-view request to Cloudflare Web Analytics — the one deliberate
third-party request the app makes. No cookies, no fingerprinting, no cross-site tracking;
stated verbatim on the **About** page.

## Relationships

- A **Festival** has many **Editions**; the app renders one.
- An **Edition** has many **Days** and many **Stages** — two and three respectively in 2026.
- A **Stage** on a **Day** holds zero or more **Acts**.
- An **Act** belongs to exactly one **Stage** on one **Day**, features exactly one
  **Artist**, and may be marked a **Favourite**.
- An **Artist** has one or more **Acts** within an **Edition**, each a separate performance,
  starred separately.
