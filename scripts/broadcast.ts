// The adapter half of the inner seam (ADR-0024 §3–§7): Broadcast's programme
// endpoint in, a Programme (or null) out. Holds source-shape validation
// phrased in Broadcast's own vocabulary and the UTC → Europe/Oslo conversion
// — the assembler (to-schedule.ts) never sees a timezone or the source's
// field names.

export type ProgrammeAct = {
  /** Broadcast's `objectId`, verbatim — one act = one performance. */
  id: string;
  name: string;
  /** ISO date, Oslo-local. */
  date: string;
  /** "HH:MM" Oslo wall-clock time. */
  start: string;
  end: string;
  /** The Stage's display name, as Broadcast's `externalVenueName` publishes it. */
  stage: string;
};

export type Programme = ProgrammeAct[];

export function broadcastUrl(festivalId: string, key: string): string {
  return `https://demo.broadcastapp.no/api/v1/festivals?key=${key}&festival=${festivalId}`;
}

/**
 * `null` means there is no Programme yet. Two known pre-Reveal states say so
 * (ADR-0023 §6, amended): every Act is stageless, or no Stage carries a
 * running order yet — on every Stage and Day with two or more Acts, all of
 * them are on stage at one and the same moment, which only placeholder
 * windows can be. The feed seen in October 2026 had Stages assigned weeks
 * before any times, and a Programme without times is still a Lineup. A
 * partial Reveal (some Acts stageless, some not) throws: that is not a value
 * this seam models, it is an error a human must see. A running order entered
 * on some Stages or Days and not others passes through for the assembler's
 * per-Stage no-overlap invariant to refuse.
 */
export function readProgramme(payload: unknown): Programme | null {
  if (!Array.isArray(payload)) {
    throw new Error("Broadcast response is not an array — the endpoint's shape changed.");
  }

  const parsed = payload.map((item, index) => parseBroadcastAct(item, index));

  const stageless = parsed.filter((act) => act.externalVenueName === "");
  if (stageless.length === parsed.length || noRunningOrderYet(parsed)) {
    return null;
  }
  if (stageless.length > 0) {
    const names = stageless.map((act) => act.name).join(", ");
    throw new Error(
      `Partial Reveal: ${stageless.length} of ${parsed.length} acts still have no stage (${names}). ` +
        "Either the Reveal has not finished, or Broadcast's data is inconsistent — check before it deploys.",
    );
  }

  return parsed.map((act) => {
    const start = toOsloLocal(act.startTimeIso);
    const end = toOsloLocal(act.endTimeIso);
    // An act crossing midnight arrives Oslo-local as end < start on the
    // act's start date — only the wall-clock time is kept for `end`, so a
    // genuine midnight crossing trips the assembler's `end > start`
    // invariant rather than being caught (or silently allowed) here.
    return {
      id: act.objectId,
      name: act.name,
      date: start.date,
      start: start.time,
      end: end.time,
      stage: act.externalVenueName,
    };
  });
}

/**
 * True when no Stage has a running order yet: in every group of two or more
 * acts sharing a Stage and an Oslo Day, the latest start is before the
 * earliest end, so there is a moment at which every act in the room is on
 * stage at once. A real running order never has that; a placeholder always
 * does, whatever windows the festival uses for it (the October 2026 feed
 * had 15:00–23:59, 14:00–22:59 and a 19:00–22:59 variant, mixed within one
 * room). A group of one has no running order to lack, parallel sets across
 * different Stages are an ordinary night, and a payload with no crowded group
 * is a Programme as it stands. A crowded group with any two acts that do not
 * overlap means times are being entered — pass it through and let the
 * no-overlap invariant decide.
 */
function noRunningOrderYet(acts: readonly RawBroadcastAct[]): boolean {
  const groups = new Map<string, RawBroadcastAct[]>();
  for (const act of acts) {
    const key = `${act.externalVenueName}\u0000${toOsloLocal(act.startTimeIso).date}`;
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [act]);
    else group.push(act);
  }
  const crowded = [...groups.values()].filter((group) => group.length >= 2);
  if (crowded.length === 0) return false;
  return crowded.every((group) => {
    const latestStart = Math.max(...group.map((act) => Date.parse(act.startTimeIso)));
    const earliestEnd = Math.min(...group.map((act) => Date.parse(act.endTimeIso)));
    return latestStart < earliestEnd;
  });
}

/**
 * A diagnostic for a red run: per Stage and Oslo Day, each distinct slot and
 * how many acts sit on it, with their names. Reads the payload loosely —
 * this runs after a throw, so it must not throw itself — and never prints
 * the key. The hourly cron's log is the only view of the feed anyone has
 * in Reveal week, and "A overlaps B" alone does not say what shape the
 * feed is in.
 */
export function slotCensus(payload: unknown): string {
  if (!Array.isArray(payload)) return "slot census: payload is not an array";
  const groups = new Map<string, Map<string, string[]>>();
  for (const item of payload) {
    const record = (typeof item === "object" && item !== null ? item : {}) as Record<
      string,
      unknown
    >;
    const stage = typeof record.externalVenueName === "string" ? record.externalVenueName : "?";
    const name = typeof record.name === "string" ? record.name : "?";
    const start = safeOslo(record.start_time_iso);
    const end = safeOslo(record.end_time_iso);
    const dayKey = `${stage || "(no stage)"} · ${start.date}`;
    const slotKey = `${start.time}–${end.time}`;
    const slots = groups.get(dayKey) ?? new Map<string, string[]>();
    groups.set(dayKey, slots);
    slots.set(slotKey, [...(slots.get(slotKey) ?? []), name]);
  }
  const lines = ["slot census (Stage · Day → slot ×acts):"];
  for (const [dayKey, slots] of [...groups.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
    for (const [slot, names] of [...slots.entries()].sort(([a], [b]) => (a < b ? -1 : 1))) {
      lines.push(`  ${dayKey} → ${slot} ×${names.length}: ${names.join(", ")}`);
    }
  }
  return lines.join("\n");
}

function safeOslo(iso: unknown): { date: string; time: string } {
  if (typeof iso !== "string" || Number.isNaN(Date.parse(iso))) return { date: "?", time: "?" };
  return toOsloLocal(iso);
}

type RawBroadcastAct = {
  objectId: string;
  name: string;
  startTimeIso: string;
  endTimeIso: string;
  externalVenueName: string;
};

function parseBroadcastAct(item: unknown, index: number): RawBroadcastAct {
  const label = `Broadcast act at index ${index}`;
  if (typeof item !== "object" || item === null) {
    throw new Error(`${label} is not an object.`);
  }
  const record = item as Record<string, unknown>;

  const objectId = record.objectId;
  if (typeof objectId !== "string" || objectId === "") {
    throw new Error(`${label} has no string "objectId".`);
  }

  const name = record.name;
  if (typeof name !== "string" || name === "") {
    throw new Error(`Act ${objectId} has no string "name".`);
  }
  const named = `"${name}" (${objectId})`;

  const isMainSchedule = record.isMainSchedule;
  if (isMainSchedule !== true) {
    throw new Error(
      `Act ${named} has "isMainSchedule": ${JSON.stringify(isMainSchedule)}, not true — its semantics are unverified, so it is refused rather than silently included or dropped.`,
    );
  }

  const startTimeIso = record.start_time_iso;
  if (typeof startTimeIso !== "string" || Number.isNaN(Date.parse(startTimeIso))) {
    throw new Error(
      `Act ${named} has a malformed "start_time_iso": ${JSON.stringify(startTimeIso)}.`,
    );
  }

  const endTimeIso = record.end_time_iso;
  if (typeof endTimeIso !== "string" || Number.isNaN(Date.parse(endTimeIso))) {
    throw new Error(`Act ${named} has a malformed "end_time_iso": ${JSON.stringify(endTimeIso)}.`);
  }

  const externalVenueName = record.externalVenueName;
  if (typeof externalVenueName !== "string") {
    throw new Error(`Act ${named} has a non-string "externalVenueName".`);
  }

  return { objectId, name, startTimeIso, endTimeIso, externalVenueName };
}

const OSLO_FORMATTER = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Oslo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

/**
 * Converts a UTC ISO instant to Oslo wall-clock date and "HH:MM" time,
 * correct across the CET/CEST boundary. Never a hard-coded offset — this is
 * the one place "this source is in UTC" is known.
 */
function toOsloLocal(iso: string): { date: string; time: string } {
  const instant = new Date(iso);
  const parts = OSLO_FORMATTER.formatToParts(instant);
  const get = (type: string): string => {
    const part = parts.find((p) => p.type === type);
    if (part === undefined) {
      throw new Error(`Could not read "${type}" from the Oslo-local conversion of "${iso}".`);
    }
    return part.value;
  };
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}
