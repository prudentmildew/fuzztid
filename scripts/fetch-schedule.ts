// Thin IO shell (ADR-0023/0024): fetch Broadcast's programme endpoint,
// readProgramme → toSchedule, write data/schedule.json. Exits non-zero on
// any failure so the hourly refresh aborts before committing — the output is
// either correct or absent, never partial.

import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { broadcastUrl, readProgramme } from "./broadcast.ts";
import { HOSTSABBAT_2026 } from "./edition-config.ts";
import { toSchedule } from "./to-schedule.ts";

const BROADCAST_KEY = process.env.BROADCAST_KEY;
if (BROADCAST_KEY === undefined || BROADCAST_KEY === "") {
  // Names the remediation, not just the fault: a red run at 23:00 in Reveal
  // week should be a one-line fix. The key is never committed — in CI it is
  // a GitHub Actions secret, locally an env var.
  throw new Error(
    "BROADCAST_KEY is not set, so there is nothing to authenticate to Broadcast with. " +
      "Locally: BROADCAST_KEY=<key> pnpm fetch-schedule. " +
      "In CI: repo Settings \u2192 Secrets and variables \u2192 Actions. It is never committed.",
  );
}

const BROADCAST_URL =
  process.env.BROADCAST_URL ?? broadcastUrl(HOSTSABBAT_2026.festival.id, BROADCAST_KEY);

const OUTPUT_PATH = fileURLToPath(new URL("../data/schedule.json", import.meta.url));

async function main(): Promise<void> {
  const response = await fetch(BROADCAST_URL);
  if (!response.ok) {
    throw new Error(`Broadcast fetch failed: HTTP ${response.status} ${response.statusText}`);
  }

  const payload: unknown = await response.json();
  const programme = readProgramme(payload);
  const schedule = toSchedule(programme, HOSTSABBAT_2026);

  writeFileSync(OUTPUT_PATH, `${JSON.stringify(schedule, null, 2)}\n`);

  const actCount = schedule.days.reduce(
    (sum, day) => sum + Object.values(day.acts).flat().length,
    0,
  );
  console.log(
    `Wrote ${OUTPUT_PATH}: ${actCount} acts across ${schedule.days.length} days ` +
      `and ${schedule.stages.length} stages.`,
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
