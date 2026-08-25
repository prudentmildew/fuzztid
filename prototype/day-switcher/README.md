# PROTOTYPE — the two-Day switcher (#12)

Throwaway. Answers one question: **what shape is the two-Day switcher?**

```sh
cd prototype/day-switcher && python3 -m http.server 8712
# then open http://localhost:8712/
```

(A server rather than `file://` only because Chrome refuses to load the woff2 otherwise.)

## What it is

The fuzztid schedule screen at **360 px**, with the real Oswald face, the #11 palette
(ADR-0025) and the real 2025 Broadcast programme remapped onto the 2026 dates. Panes
scroll-snap; the active tab follows the swipe at the same 50 % boundary `notifyActiveDay`
rounds at; tapping a tab calls a `showDay(date)` that is horizontal-only and animated.

Four axes, all in the URL and on the floating bar:

| Param | Values |
|---|---|
| `variant` | `A` tabs in the header row · `B` its own strip below · `C` dominant day + toggle |
| `labels` | `wd-date` (FRI 23) · `wd` (FRI) · `date` (23 OCT) · `wd-long` (FRIDAY) |
| `marker` | `dot` · `chip` · `underline` · `none` |
| `clock` | `day1` · `day2` · `none` — moves the simulated Oslo now, so the today marker can be judged under `today`, `past`/`future` and `none` |

Tap an act to star it; tap the heart for Focus. Both are here so the today marker can be
judged against the *other* two things the accent means (ADR-0025 §8).

Not production code: no tests, no error handling, no abstractions, and the header is
rebuilt wholesale on every state change where the real one would not be.
