// The assembler half of the inner seam (ADR-0024 §3–§7): a Programme (or
// null) in, the canonical Schedule out. String-and-integer logic — no
// `Intl`, no timezone; that conversion already happened in broadcast.ts.
// Fail-loud: the output is either correct or absent, never partial.
//
// Invariants, checked in this order per act: known Stage, known Day,
// end > start, unique id, per-Stage no-overlap. Then group, envelope, sort.

import type { Act, Day, Schedule } from "../src/schedule.ts";
import type { Programme } from "./broadcast.ts";
import type { EditionConfig } from "./edition-config.ts";

export function toSchedule(programme: Programme | null, config: EditionConfig): Schedule {
  if (programme === null) {
    return unpublishedSchedule(config);
  }

  const actsByDayAndStage = new Map<string, Map<string, Act[]>>();
  const seenIds = new Set<string>();

  for (const pact of programme) {
    const stage = config.stages.find((s) => s.name === pact.stage);
    if (stage === undefined) {
      throw new Error(
        `Unknown stage "${pact.stage}" on "${pact.name}" (${pact.id}). Add it to the edition config's stages.`,
      );
    }

    if (!config.days.includes(pact.date)) {
      throw new Error(
        `Unknown day "${pact.date}" on "${pact.name}" (${pact.id}). Add it to the edition config's days, or confirm the source date — a stray date is a red run, not a silent third pane.`,
      );
    }

    const start = parseTime(pact.start, "start", pact);
    const end = parseTime(pact.end, "end", pact);
    if (end.minutes <= start.minutes) {
      throw new Error(
        `Act "${pact.name}" (${pact.id}) ends at ${end.hhmm}, which is not after its ${start.hhmm} start.`,
      );
    }

    if (seenIds.has(pact.id)) {
      throw new Error(`Duplicate act id "${pact.id}" ("${pact.name}").`);
    }
    seenIds.add(pact.id);

    const act: Act = {
      id: pact.id,
      name: pact.name,
      start: start.hhmm,
      end: end.hhmm,
      start_min: start.minutes,
      end_min: end.minutes,
    };

    let dayActs = actsByDayAndStage.get(pact.date);
    if (dayActs === undefined) {
      dayActs = new Map();
      actsByDayAndStage.set(pact.date, dayActs);
    }
    const stageActs = dayActs.get(stage.id);
    if (stageActs === undefined) {
      dayActs.set(stage.id, [act]);
    } else {
      const overlapping = stageActs.find(
        (existing) => act.start_min < existing.end_min && existing.start_min < act.end_min,
      );
      if (overlapping !== undefined) {
        throw new Error(
          `"${act.name}" (${act.start}–${act.end}) overlaps "${overlapping.name}" (${overlapping.start}–${overlapping.end}) on ${stage.name}.`,
        );
      }
      stageActs.push(act);
    }
  }

  // Days are data-driven: a configured date with no Acts yields no pane —
  // that's deliberately overridden for the unpublished branch above, where
  // the Days come from the config instead.
  const days: Day[] = [...actsByDayAndStage.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([date, dayActs]) => {
      const all = [...dayActs.values()].flat();
      const acts: Record<string, Act[]> = {};
      for (const stage of config.stages) {
        acts[stage.id] = (dayActs.get(stage.id) ?? []).sort(
          (a, b) => a.start_min - b.start_min || (a.id < b.id ? -1 : 1),
        );
      }
      return {
        date,
        start_min: Math.min(...all.map((a) => a.start_min)),
        end_min: Math.max(...all.map((a) => a.end_min)),
        acts,
      };
    });

  return { stages: config.stages, days };
}

/**
 * `toSchedule(null, config)` — the Edition's Days and Stages from the
 * config, no Acts. The invariants have nothing to check, so the pipeline
 * writes this rather than exiting without writing: the deployed app always
 * has something honest to render.
 *
 * An unpublished Day's envelope is `start_min: 0, end_min: 0` — the honest
 * degenerate rather than deriving `±Infinity` from an empty Act list. It is
 * never read: the app branches on `isPublished` before it ever computes a
 * time origin.
 */
function unpublishedSchedule(config: EditionConfig): Schedule {
  return {
    stages: config.stages,
    days: config.days.map((date) => ({
      date,
      start_min: 0,
      end_min: 0,
      acts: Object.fromEntries(config.stages.map((stage) => [stage.id, []])),
    })),
  };
}

/** Validates an "HH:MM" wall-clock time and converts it to minutes since midnight. */
function parseTime(
  value: string,
  field: "start" | "end",
  pact: { name: string; id: string },
): { hhmm: string; minutes: number } {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (match === null) {
    throw new Error(`Act "${pact.name}" (${pact.id}) has a malformed ${field} time "${value}".`);
  }
  return { hhmm: value, minutes: Number(match[1]) * 60 + Number(match[2]) };
}
