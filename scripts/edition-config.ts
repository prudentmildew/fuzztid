// Festival-edition config (ADR-0024 §3–§7): the one file that changes
// between Editions. `stages` is the canonical Stage[] and the Stage's `name`
// is the source match — Broadcast's `externalVenueName` is already the
// display name, so no separate match key exists. `days` is an allowlist of
// the Edition's dates; a stray date is a red run, not a silent third pane.

import type { Stage } from "../src/schedule.ts";

export type EditionConfig = {
  festival: { id: string; name: string };
  days: string[];
  stages: Stage[];
};

const STAGES: Stage[] = [
  { id: "the-chapel", name: "The Chapel" },
  { id: "the-crypt", name: "The Crypt" },
  { id: "verkstedet", name: "Verkstedet" },
];

export const HOSTSABBAT_2026: EditionConfig = {
  festival: { id: "XIanfZspWO", name: "Høstsabbat 2026" },
  days: ["2026-10-23", "2026-10-24"],
  stages: STAGES,
};

export const HOSTSABBAT_2025: EditionConfig = {
  festival: { id: "dEoMHOghYt", name: "Høstsabbat 2025" },
  days: ["2025-10-24", "2025-10-25"],
  stages: STAGES,
};
