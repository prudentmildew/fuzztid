---
status: accepted
---

# One dark palette, no Stage colour

_New decision, original to Høstsabbat. **Supersedes** Øyablikk's
[0007](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0007-concert-poster-visual-idiom.md)
(concert-poster idiom, no theme toggle): the no-toggle stance is kept but re-derived, the
per-Stage fills are cut, and the palette is Høstsabbat's own. Consumes
[#4](https://github.com/prudentmildew/fuzztid/issues/4)'s placement decision (colour lives
in `styles.css`, no hex in TS) and [#3](https://github.com/prudentmildew/fuzztid/issues/3)'s
cut of the Stage filter. Decided in [#11](https://github.com/prudentmildew/fuzztid/issues/11)._

Øyablikk paints each Act block in its Stage's colour so that **seven** columns are tellable
apart, and pins the seven fills plus an accent as a tested artefact:
`scripts/validate-palette.ts` (147 lines of Machado-2009 CVD simulation and Lab ΔE) with
`validate-palette.test.ts` enforcing contrast and pairwise-distance thresholds in CI.
0007 justifies the whole idiom on one use context — *"on a phone, in direct sun, in a
crowd."*

Høstsabbat has **three** Stages, all rooms inside Kulturkirken Jakob, and the app is used in
a dark stone church in late October. Both premises are void.

## Decisions

1. **Stage colour is cut.** `Stage` stays `{ id, name }` (#4), `--stage-color` and
   `--stage-text-color` never enter `styles.css`, and no colour is keyed to a Stage
   anywhere. Three columns in fixed positions, under a Stage row that is static across Day
   changes (0012), are told apart by position and a permanent label. Colour was doing at
   seven columns what position does at three.
2. **One design, no theme toggle** — 0007's stance survives, its reasoning does not. A
   toggle still asks the user to find a setting at the moment they are least able to, and a
   dark room wants a dark app more than a sunlit field does.
3. **A luminance ceiling, which 0007 never needed.** In a dark church the phone *is* the
   light source. The foreground is bone `#d9d2c7` at **65 %** relative luminance, never
   `#ffffff`. Peak brightness is capped across the board; the accent is distinguished by
   **hue**, not by being the brightest thing on screen.
4. **The palette is authored here, not adopted from Broadcast.** Broadcast serves a
   per-festival `themeConfig`, and it was seriously considered as *the festival's own*
   palette. It fails on four counts, in order of decisiveness:
   - The **2026 record has no `themeConfig` at all** — the key is absent from `appConfig`.
     There is nothing to adopt for the target Edition.
   - It carries **no per-Stage colours** in any edition, so it could never have answered
     decision 1 either way.
   - It is **partly unconfigured default**: `mutedForeground #f5f5f5` on `muted #F5F5F5` is
     **1.00:1**, literally invisible, and `secondary #E3D3C0` / `border #eeeef0` /
     `primaryForeground #23273A` are light-theme template leftovers. Its own
     `primary #b85050` on its own `background #393837` is **2.40:1** — under the 3:1
     large-text floor. This is not a curated identity.
   - It lives on the metadata endpoint, which has **no CORS** and which
     [0023 §4](./0023-broadcast-feed-as-programme-source.md) already declined to use.

   `#b85050` remains a useful *reference point* for the neighbourhood. Nothing at build time
   or runtime reads a colour from Broadcast, so the app's identity never moves with someone
   else's CMS.
5. **The register is a doom record sleeve, not a gig poster.** 0007's **flipped type
   hierarchy** — Act name dominant, Day label subordinate — is kept in full; it is what makes
   the grid readable at arm's length and it is genre-independent. 0007's *saturated fills*
   clause goes with decision 1. What carries the register instead is the **red-tinted
   near-black Act surface**: the difference between "a schedule app in dark mode" and this
   app.
6. **The Act block separates by edge, not by fill.** Øyablikk got block separation free from
   a saturated fill; a neutral dark fill tops out near 1.3:1 against the ground at any
   luminance that keeps text comfortable. So an Act is `--surface` with a `--border`
   hairline, and **Focus** dims by dropping unstarred blocks toward the ground rather than
   by reducing opacity over a saturated fill.
7. **The accent is ember `#d9452f`, and this is a measured constraint, not a taste call.**
   To carry near-black text at 4.5:1 an accent needs ≥ **18.9 %** luminance; pure `#ff0000`
   is 21.3 % and only just clears it. **Every recognisably blood-red is disqualified as a
   text ground** — the deep red `#b8434a` that best fit the register measures **2.88:1**
   against the Act surface and **3.71:1** under near-black text, so a starred Act could take
   neither an accent fill nor an accent border, and the Now line's pill would have to
   abandon its dark-on-accent form. Ember clears every floor and still reads as fire.
8. **The accent means exactly two things**: the **Now line** and **Favourites**. With no
   fills competing for attention, one colour now does the work seven used to.

### The tokens

Defined once, in `src/styles.css`. No hex appears in TypeScript (#4).

| Token | Value | Role |
|---|---|---|
| `--bg` | `#0b0a0c` | the ground |
| `--surface` | `#2a2326` | Act block — near-black with a red cast |
| `--border` | `#4a3d40` | Act block hairline |
| `--fg` | `#d9d2c7` | bone — 65 % luminance, never `#ffffff` |
| `--muted` | `#948b83` | ash — times, subordinate labels |
| `--accent` | `#d9452f` | ember — Now line, Favourites |

Measured, all clearing their floors:

| Check | Ratio | Floor |
|---|---|---|
| `--fg` on `--bg` | 13.16 | 4.5 |
| `--fg` on `--surface` | 10.24 | 4.5 |
| `--muted` on `--surface` | 4.59 | 4.5 |
| `--muted` on `--bg` | 5.91 | 4.5 |
| `--surface` on `--bg` | 1.29 | 1.25 |
| `--border` on `--surface` | 1.49 | 1.25 |
| `--accent` on `--bg` | 4.56 | 3.0 |
| `--accent` on `--surface` | 3.54 | 3.0 |
| near-black text on `--accent` | 4.56 | 4.5 |

9. **The palette stays a tested artefact; the machinery does not.**
   `scripts/validate-palette.ts` drops from 147 lines to its `contrastRatio` helper (~15),
   and a test reads the tokens out of `src/styles.css` and asserts the floors above — about
   45 lines in total against Øyablikk's ~230. All CVD simulation and Lab ΔE is deleted: it
   existed to keep **fills pairwise distinct**, and with one fill there are no pairs. Reading
   `styles.css` is not a workaround for #4 having emptied the TS config of colour — it is
   strictly better, because the test now checks what actually ships instead of a duplicate
   #4 deliberately deleted.

## Considered options

- **Keep per-Stage colour at three Stages.** Cheap character, and three desaturated tints
  would suit the register. Rejected: it re-earns nothing that position and a static Stage row
  don't already provide, it keeps 147 lines of validator alive to protect it, and it puts
  three fills back in competition with the accent — which then can no longer mean just
  "now" and "starred".
- **Adopt Broadcast's `themeConfig`.** The strongest argument in the ticket — it is the
  festival's *own* chosen palette, which Øyablikk's app-convention palette never was.
  Rejected on the four counts in decision 4; the appeal does not survive `mutedForeground`
  at 1.00:1 and a `themeConfig` that does not exist for 2026.
- **Deep red `#b8434a` as the accent**, with the Now pill inverted to accent-text-on-ground
  and Favourites marked by something other than accent. Rejected: a colour that fails
  against the surface it sits on is an unreadable aesthetic, not a doom one, and the two
  things the accent marks are exactly the two that must read instantly in a dark room.
- **Outline-only Act blocks.** Lighter than a filled surface, and it sidesteps the
  separation problem. Rejected: a scrolling grid of empty outlines loses the solidity that
  makes the schedule scannable, and it leaves the register with nothing to sit in.
- **A neutral (untinted) Act surface.** One fewer decision. Rejected: with the fills gone,
  the tint is the only thing left carrying the visual identity.
- **Delete the palette validation outright** and state the floors in prose here. Rejected:
  0007's real value was that the palette is a *tested* artefact — a future tweak that breaks
  a floor should fail CI, not eyes — and preserving that property now costs ~45 lines.
- **Keep the CVD simulation against a future return of Stage colour.** Speculative
  generality for a decision this ADR just made; it is in Øyablikk's history if it is ever
  needed.

## Consequences

- `scripts/validate-palette.ts` and its test shrink by ~185 lines; `edition-config.ts` gains
  no palette, closing out #4's "colour leaves the seam".
- [Shape the two-Day switcher](https://github.com/prudentmildew/fuzztid/issues/12) renders
  these tokens in situ at 360 px and may nudge a value inside the stated floors — an
  adjustment, not a re-decision. Its today-marker inherits `--accent`.
- **Focus** (0021, ported by reference in #3) changes mechanism: it dims toward `--bg`
  rather than reducing opacity over a saturated fill.
- The Now line's pill keeps Øyablikk's dark-text-on-accent form, so 0022's `past`/`future`
  treatment (`--muted`, 1 px, pill hidden) ports unchanged.
- Any future return of per-Stage colour would need the pairwise-distance machinery back, and
  is a fresh decision against this one.
