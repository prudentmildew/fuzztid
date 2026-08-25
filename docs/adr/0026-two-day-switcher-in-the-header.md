---
status: accepted
---

# Two Day tabs in the Header, today marked by a dot

_Original to Høstsabbat. **Supersedes in part** Øyablikk's
[0022](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0022-day-standing.md)
(Day standing): the standing model, the Now line's `past`/`future` treatment and the
minute-tick re-derive all survive, but the header `TODAY` chip and the back-to-today
button do not. **Amends** Øyablikk's
[0012](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0012-schedule-chrome-is-static-across-day-swipes.md)
(chrome static across Day swipes). Executes the cuts made in
[#3](https://github.com/prudentmildew/fuzztid/issues/3), consumes
[#5](https://github.com/prudentmildew/fuzztid/issues/5)'s `showDay` / `onActiveDayChange`
seam, and discharges [0025](./0025-single-fill-palette-no-stage-colour.md)'s stated
consequence that the today marker inherits `--accent`. Decided in
[#12](https://github.com/prudentmildew/fuzztid/issues/12) against a prototype on branch
[`prototype/day-switcher`](https://github.com/prudentmildew/fuzztid/tree/prototype/day-switcher/prototype/day-switcher)._

Øyablikk has four Days and teaches the swipe between them with a first-visit nudge
(0017) — 36 lines of module, an `animatePeek` choreography, and a grace window arbitrating
against the install sheet. #3 cut all of it: with **two** Days the gesture is half a screen
from its own boundary in either direction, and a control that is simply *visible* beats one
that has to be taught. #3 also cut 0022's `TODAY` chip and its back-to-today button, and
moved today-ness onto the new switcher — leaving its form open. This is the form.

0022 rejected "a day-position indicator in the header (dots, tabs)" on a stated width
constraint: the Header is a single non-wrapping row and `TODAY · WED 12 AUG` does not fit
at 1.4 rem on a 360 px screen. **That constraint is void here, and it was measured rather
than argued.** At 360 px, with the real Oswald face:

| Header content | Used | Slack |
|---|---|---|
| `fuzztid` + `FRI 23` `SAT 24` + ♥ ⓘ | 285 px | **41 px** |
| the same with `FRIDAY` / `SATURDAY` | 313 px | 13 px |
| the same with no today marker at all | 274 px | 52 px |

Three things pay for it: the wordmark is `fuzztid` lowercase at **64 px** where Øyablikk's
is uppercase, the tabs sit at 1.05 rem where the day label sat at 1.4 rem, and there are
two action buttons, not three (the gear became the ⓘ, and the Stage filter is gone).

## Decisions

1. **Two tabs, inside the Header row.** No new horizontal band. The alternative — a 38 px
   strip between the Header and the Stage row — buys width that the measurement says
   nobody needs, and buys it on a screen whose whole idiom is vertical time. The Header
   becomes: wordmark, switcher, spacer, Focus heart, ⓘ.

2. **The wordmark is `--fg`, not `--accent`.** Øyablikk paints its logo in the accent;
   that line of CSS must not port. [0025 §8](./0025-single-fill-palette-no-stage-colour.md)
   reserves the accent, and an accent wordmark sitting a few pixels from the today dot
   would be the loudest false signal on the screen.

3. **The `<h1>` moves to the wordmark.** In Øyablikk the day label was the `<h1>`; a
   tablist is not a heading, and the app's name is.

4. **The labels are `FRI 23` / `SAT 24`** — weekday and day-of-month, uppercase, no month.
   The month is redundant (one Edition, both Days in October) and costs 6 px. Bare `FRI` /
   `SAT` saves 46 px and is unambiguous across two Days, but drops the number a ticket and
   a lock screen both carry; 11 px is a cheap price for telling both.

5. **Selected and today are two independent axes, carried by two different means.**

   | Axis | Carried by | ARIA |
   |---|---|---|
   | which pane is showing | `--fg` at weight 600 vs `--muted` at 400 | `aria-pressed` |
   | which Day is today | a 6 px `--accent` dot leading the label | `aria-current="date"` |

   They are independent because they genuinely are: on Saturday, Friday's tab is the
   marked one and Saturday's is the selected one, and the app must be able to say both at
   once. `aria-current="date"` is 0022's own convention, ported — a 6 px dot is invisible
   to a screen reader.

6. **The dot's space is reserved under standing `none`.** For ~363 days a year no tab is
   today and no dot is drawn, but its box stays (`visibility: hidden`), so the Header's
   geometry does not shift when the standing changes under an Oslo midnight. This is the
   same discipline 0022 used when it centred `.app-brand` rather than baseline-aligning it.

7. **The tabs are two plain `<button>`s, not a `role="tablist"`.** Both panes are always in
   the DOM and horizontally scrollable (0012); a tabpanel's siblings are hidden, so calling
   them tabs would be a lie the assistive tree then has to live with — and `role="tablist"`
   drags in an arrow-key contract this touch-first app has no other use for. Two buttons
   with `aria-pressed` and `aria-current` describe exactly what is there.

8. **The tap targets fill the row.** As laid out the tabs are 37 px tall; negative vertical
   margin plus matching padding takes them to the Header's full 56 px, the same trick 0022
   used on `.app-today-button` so that the label's box did not move. Horizontal padding
   stays 5 px, so the pair reads as one group rather than as two buttons.

9. **Swipe coupling.** The active tab flips at the 50 % boundary `notifyActiveDay` already
   rounds at — under the finger, mid-drag, in step with the Now line's standing. Tapping a
   tab calls #5's `showDay(date)`: horizontal only, `behavior: "smooth"`, and it never
   re-scrolls to now, so [0008](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0008-live-mode-default-day-and-scroll.md)'s
   once-per-session scroll-to-now holds unqualified. A Day change rewrites `aria-pressed`
   on two buttons and nothing else.

10. **0012 is amended, the same shape 0022 already amended it.** The Header is still built
    once, outside `.days`, and is never rebuilt on a swipe. It is no longer *visually*
    invariant across one. 0012's purpose — no per-pane chrome, no rebuild on swipe — is
    intact.

## Considered options

- **Its own strip below the Header** (a 38 px band, two 50/50 tabs, active one filled).
  The strongest rival, and the one 0022's width worry would have forced. Rejected on the
  measurement: it buys 240 px of width against a 41 px shortfall that does not exist, and
  it charges a horizontal band on a screen that is otherwise all vertical time. Its one
  real merit — fill for *selected*, marker for *today*, unmistakably separate — is
  available in the Header row at weight instead of fill.
- **A dominant day plus a subordinate toggle** (`FRI 23` at 1.4 rem, `sat 24` small and
  muted beside it). Closest to 0022's surviving shape and the least new chrome. Rejected:
  it makes one of two equal Days subordinate, and the hierarchy inverts on every swipe —
  the type in the Header resizes under the user's finger.
- **The accent chip, inherited from 0022.** Not rejected on width: at 4 px it is *cheaper*
  than the dot's 11 px. Rejected on meaning. 0022's chip worked because it **replaced** the
  date with the word `TODAY`; a chip that merely wraps `FRI 23` in accent says nothing the
  word said, and what it does say — a filled, high-contrast tab — is already how *selected*
  reads everywhere else. On Saturday the user would face an accent-filled Friday next to a
  plain Saturday.
- **A 2 px accent underline under the today tab.** The runner-up, and free in width. It
  carries position as well as colour, which the dot does not. Rejected as the weaker signal
  of the two at a glance in a dark room, and because an underline under one of two adjacent
  tabs is the most conventional way there is to draw *selected*.
- **No marker at all**, leaving today-ness to the Now line's standing alone. Rejected for
  the reason 0022 gave and #3 upheld: the line only exists inside the daily envelope, so it
  is dark for fourteen hours of every day — including the festival mornings when people
  open the app to plan.
- **`FRIDAY` / `SATURDAY`.** Affordable (13 px of slack, 24 px with the marker's space
  reserved rather than filled) and the most legible option at arm's length. Rejected: it
  spends the row's entire remaining margin on two words whose first three letters already
  say it, and leaves nothing for a longer wordmark, a wider safe-area inset, or a 320 px
  screen.

## Consequences

- The accent now marks three things, but only two of them in the grid: the Now line, a
  Favourite, and — 6 px of it, in the Header — today. 0025 §8 anticipated this exactly
  ("its today-marker inherits `--accent`"), so this discharges that consequence rather
  than amending the rule.
- `CONTEXT.md`'s **Day switcher** entry was written form-independently in
  [#10](https://github.com/prudentmildew/fuzztid/issues/10) and describes this without
  edit: *one tab per Day, with the tab that is today marked, and nothing marked under
  standing `none`.* No vocabulary changes.
- No pixels leave the grid: Header 56 px and Stage row 30 px are unchanged, so the
  ~4 acts per column per day sit exactly where they would have.
- 0022's `.app-today-chip`, `.app-today-button` and `.app-today-arrow` do not port, and
  neither does `renderDayLabel`. What ports from 0022 is the standing model in `now.ts`,
  the Now line's `past`/`future` treatment, the 180 ms fade, and the minute-tick re-derive.
- A third Day would not break this — three tabs at these widths still fit — but it would
  reopen the nudge question 0017 answered and #3 cut, and that is a fresh decision.
