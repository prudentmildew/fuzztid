// The dev-only debug switch (#29): a way to browse the app against a real
// Schedule while data/schedule.json is still the unpublished 2026 skeleton.
// Everything behind `isPublished` — the grid, the Now line, the Day
// switcher, Favourites, Focus — is unreachable until the Reveal without it.
//
//   ?schedule=2025            render src/fixtures/schedule.fixture.json
//   ?now=2025-10-24T20:30     pin the clock — Oslo wall-clock, as an offset
//
// The two are independent; `?schedule=2025` alone lands the clock on that
// Schedule's first Day at 20:30, so it opens on a live grid rather than a
// dormant one. A bad value warns and boots on real data — never throws.
//
// This is the only file that knows any of this exists, and none of it
// reaches the production bundle: the whole body is behind
// `import.meta.env.DEV`, and the fixture is a dynamic import *inside* that
// dead branch (a static import would survive tree-shaking and ship 25 Acts
// of 2025 JSON). Proven, not assumed: `pnpm build`, then grep dist/ for a
// 2025 Artist — zero hits.

import { osloDate, osloMinutes } from "./now.ts";
import type { Schedule } from "./schedule.ts";

// The Editions whose Schedule ships as a fixture: the values `?schedule=` accepts.
const PAST_EDITIONS = ["2025"] as const;
const NOW_FORMAT = "YYYY-MM-DDTHH:MM";
const DEFAULT_PIN = "20:30";

type DebugParams = {
  schedule: (typeof PAST_EDITIONS)[number] | null;
  /** The pinned instant, already interpreted as Oslo wall-clock. */
  now: Date | null;
  warnings: string[];
};

export async function applyDebugParams(
  url: string | URL,
  production: Schedule,
): Promise<{ schedule: Schedule; now: () => Date }> {
  const real = (): Date => new Date();
  if (!import.meta.env.DEV) return { schedule: production, now: real };

  const params = parseDebugParams(new URL(url).searchParams);
  for (const warning of params.warnings) console.warn(warning);

  let schedule = production;
  if (params.schedule === "2025") {
    const fixture = await import("./fixtures/schedule.fixture.json");
    schedule = fixture.default as Schedule;
  }

  const firstDay = schedule.days[0]?.date;
  const pinned =
    params.now ??
    (params.schedule !== null && firstDay !== undefined
      ? osloWallClockToInstant(`${firstDay}T${DEFAULT_PIN}`)
      : null);
  if (pinned === null) return { schedule, now: real };

  // An offset, not a freeze: the line still moves on the minute and
  // today-ness still re-derives under an Oslo midnight (stories 20, 26).
  // How far the pinned instant sits from the real one, fixed once at boot.
  const delta = pinned.getTime() - Date.now();
  return { schedule, now: () => new Date(Date.now() + delta) };
}

function parseDebugParams(search: URLSearchParams): DebugParams {
  const params: DebugParams = { schedule: null, now: null, warnings: [] };

  const schedule = search.get("schedule");
  if (schedule !== null) {
    const known = PAST_EDITIONS.find((s) => s === schedule);
    if (known !== undefined) {
      params.schedule = known;
    } else {
      params.warnings.push(
        `[fuzztid] ?schedule=${schedule} is not a Schedule this build knows — accepted: ${PAST_EDITIONS.join(", ")}. Booting on the real Schedule.`,
      );
    }
  }

  const now = search.get("now");
  if (now !== null) {
    const instant = osloWallClockToInstant(now);
    if (instant !== null) {
      params.now = instant;
    } else {
      params.warnings.push(
        `[fuzztid] ?now=${now} is not an Oslo wall-clock time in the form ${NOW_FORMAT} (e.g. 2025-10-24T20:30). Booting on the real clock.`,
      );
    }
  }

  return params;
}

const WALL_CLOCK = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * `YYYY-MM-DDTHH:MM` read as Oslo wall-clock, whatever the host's zone —
 * `new Date("2025-10-24T20:30")` would read it as host-local, which is right
 * on a laptop in Oslo and wrong everywhere else. Null when it is not in that
 * form or names a time that does not exist (a 30 February, a 24:00, the
 * hour a spring clock change skips). The autumn hour that happens twice
 * resolves to its second, CET reading.
 */
function osloWallClockToInstant(wallClock: string): Date | null {
  const match = WALL_CLOCK.exec(wallClock);
  if (match === null) return null;
  const [y, mo, d, h, mi] = match.slice(1).map(Number) as [number, number, number, number, number];

  // Treat the wall-clock as UTC, then pull it back by Oslo's offset at that
  // instant; a second pass settles the offset across a DST boundary.
  const asUtc = Date.UTC(y, mo - 1, d, h, mi);
  let instant = asUtc - osloOffsetMs(new Date(asUtc));
  // A wall-clock whose Oslo reading leaves the four-digit years (late on
  // 9999-12-31) parses to NaN, and an invalid Date reaching the formatter
  // throws a RangeError — the one way this could have broken "never throws".
  if (!Number.isFinite(instant)) return null;
  instant = asUtc - osloOffsetMs(new Date(instant));
  if (!Number.isFinite(instant)) return null;

  // Round-trip: the instant must read back as the wall-clock it was given,
  // which is what rejects a time that does not exist in Oslo — Date.UTC
  // would have rolled a 30 February on into March without a word.
  const date = new Date(instant);
  const readsBack = osloDate(date) === wallClock.slice(0, 10) && osloMinutes(date) === h * 60 + mi;
  return readsBack ? date : null;
}

// Oslo's UTC offset at `at`, read through the same two formatters the Now
// line already keeps the clock with (now.ts) — so this adds no formatter of
// its own for Rollup to leave standing in the production bundle.
function osloOffsetMs(at: Date): number {
  const osloMidnightAsUtc = Date.parse(`${osloDate(at)}T00:00Z`);
  return osloMidnightAsUtc + osloMinutes(at) * 60_000 - at.getTime();
}
