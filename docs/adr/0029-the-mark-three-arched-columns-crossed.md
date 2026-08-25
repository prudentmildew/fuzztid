---
status: accepted
---

# The mark: three arched columns crossed by the Now line

_New decision, original to Høstsabbat, and one Øyablikk never wrote down at all. Its
[0007](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0007-concert-poster-visual-idiom.md)
(concert-poster idiom, no theme toggle) and
[0011](https://github.com/prudentmildew/oyablikk/blob/main/docs/adr/0011-no-third-party-requests-self-hosted-assets.md)
(self-hosted assets) port by reference and are the frame this sits in; neither describes a
mark. Consumes [0025](./0025-single-fill-palette-no-stage-colour.md)'s palette, applies
[0026](./0026-two-day-switcher-in-the-header.md) §2's wordmark stance outside the Header,
and discharges the one asset gap [#17](https://github.com/prudentmildew/fuzztid/issues/17)
carried as an assumption. Decided in
[#18](https://github.com/prudentmildew/fuzztid/issues/18)._

Øyablikk's mark is its initial letterform. The `Ø`'s bowl is seven arcs in the seven stage
colours and its slash is the accent — the icon *is* the palette, and a test asserts exactly
that: *"contains all seven stage fills and the accent"*. 0025 deleted Stage colour, so the
construction has nothing left to carry, the mark cannot be copied, and neither can the test.

Nothing else in `public/` is in question. The manifest's shape, the head tags and the OG
card's layout all port unchanged. Only the artwork is open.

## Decisions

1. **The mark is three arched columns crossed by the Now line.** Three tall lancets —
   flat-footed, semicircular tops — in `--surface` with `--muted` edges on `--bg`, crossed
   at 57 % height by a full-width `--accent` rule. It reads three ways at once and all three
   are true: the three **Stages**, the window of a stone church, and the **Now line** through
   a **Schedule**. Where Øyablikk's mark encodes its palette, this one encodes its *screen*.

2. **The accent appears exactly once, and means what it means everywhere else.** The rule in
   the mark is the Now line. This is not a third job for `--accent` beside 0025's two and
   0026's today dot — it is the first of them, drawn at icon scale.

3. **Palette-only, and that is the testable rule.** The mark uses four of 0025's six tokens
   (`--bg`, `--surface`, `--muted`, `--accent`) and no colour from outside them. The
   assertion that replaces Øyablikk's seven-stage-fills test is: every fill and stroke in
   `favicon.svg` is one of the six tokens, and `--accent` occurs once. That is a stronger
   guard than the one it replaces — it fails on a stray hex, not just a missing one.

4. **`favicon.svg` is the source of truth; the five PNGs are renders of it.** No generator
   script and no new dependency — the repo has ten devDependencies and this earns none.
   The geometry is stated here so the mark can be redrawn from prose, and the rasterisation
   recipe is a headless-browser screenshot at the target size. On a 512 viewBox: columns
   76 wide, 40 apart, first at x 102, from y 80 to 432, arch radius 38, stroke 16, miter
   joins; the accent rule spans x 44 → 468 at y 292, stroke 36.

5. **The maskable icon is the same mark at 0.76 scale, centred — not a redraw.** Its
   furthest content sits 191 px from centre against a 205 px safe radius, and `--bg` bleeds
   to the edge. One drawing, two exports.

6. **`background_color` and `theme_color` are `#0b0a0c`, not `#000000`.** Øyablikk's manifest
   and `theme-color` are pure black; 0025 chose `--bg` a shade off black deliberately, and the
   chrome the OS paints around an installed app should be the app's ground, not a near-miss.

7. **The wordmark is lowercase `fuzztid` in `--fg`, on the OG card as in the Header.** Øyablikk
   paints its wordmark in the accent and sets it uppercase; 0026 §2 already struck that for the
   Header, on the grounds that the accent is reserved. It is struck outside the Header for the
   same reason. Oswald 700, the same self-hosted face the app uses (0011, ported by reference).

8. **The OG card's layout ports: mark left, wordmark and two lines of copy right, on `--bg`.**
   1200 × 630. Tagline in `--fg`, venue and dates in `--muted`. It is the only place the mark
   and the wordmark appear together, which is what makes the mark legible as *this* app's mark
   to someone who has never opened it.

9. **One description string, used in three places** — the `<title>`, the `description` meta and
   `og:description`, and the manifest's `description`: *"Who's on right now, on which stage? A
   mobile programme for Høstsabbat 2026 at Kulturkirken Jakob, Oslo, 23–24 October."* It ports
   Øyablikk's sentence shape and its "on which stage?" verbatim — the glossary's word, not
   *room* or *venue*.

10. **`og.png` ships in `public/` and stays out of the precache glob**, which is
    [0027](./0027-navigation-race-precache-only-fallback.md) §5 unchanged. It is read
    server-side by crawlers and never by a client, so it must exist and must not be cached.

## Considered options

- **The `f` and its crossbar** — the closest structural analogue to the sibling: initial
  letterform in `--fg`, its one crossbar in `--accent`. Rejected on two counts. A lowercase
  `f` is the most-used glyph in software marks, so the silhouette does no work in a launcher
  full of other icons; and Oswald's crossbar is short, which lands the accent as a tick rather
  than a line. It would also carry the name and nothing else, where the name is already
  carried by the wordmark everywhere the wordmark fits.
- **The wordmark stacked** — `fuzz` over `tid`, split by an accent rule. Rejected: seven
  letters in two rows is a grey smudge at 16 px, and it leaves the mark with no idea in it
  beyond the name.
- **Columns running off the bottom edge**, open-footed, for a more architectural read. Drawn
  and compared. Rejected: it loses the maskable export (the feet float once scaled inside the
  safe circle) and reads as a crop rather than a mark at launcher size.
- **`--border` for the column edges**, mirroring an Act block exactly — `--surface` fill,
  `--border` edge, which is what the app actually draws. Drawn and rejected on evidence:
  `#4a3d40` on `#0b0a0c` all but vanishes below 96 px, and an icon is not a screen. `--muted`
  is the same palette and survives a browser tab.
- **A generator script in `scripts/`.** Rejected: it would be the only thing in the repo that
  needs a browser to run, to regenerate six files that change approximately never.

## Consequences

- **The install icons total ~14.6 KB against Øyablikk's ~41 KB** — flat fills, no gradients,
  four colours. 0027 §5 budgeted "192/512/maskable/apple-touch, ~41 KB" as the part of the
  precache worth keeping; it costs about a third of that here, which widens the margin its
  argument rests on rather than changing it.
- **The mark says nothing about the name.** Someone who sees the icon cold learns the app is
  about three things and a moment in time, not that it is called `fuzztid`. Accepted: the
  wordmark sits in the Header of every screen, in the OG card beside the mark, and under the
  icon on the home screen.
- **Three columns is a data-shaped mark.** A fourth Stage would make it wrong. The three are
  rooms in one building rather than tents in a park, so the count is a property of Kulturkirken
  Jakob and not of a given year — but it is a dependency the sibling's mark did not have, and
  0023's config is where a fourth would first appear.
- **The 16 px favicon is the weakest size**, as it is for any mark with an outline in it: the
  `--muted` edges thin to sub-pixel and it resolves to three pale bars and a red rule. Judged
  acceptable — that silhouette is still distinct in a tab strip, and stroke weight was raised
  from 14 to 16 to buy it, at a small cost to how the mark reads at 512.
