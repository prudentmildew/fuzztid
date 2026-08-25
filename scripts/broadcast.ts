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
 * `null` means there is no Programme yet — every Act is stageless, the known
 * pre-Reveal state. A partial Reveal (some Acts stageless, some not) throws:
 * that is not a value this seam models, it is an error a human must see.
 */
export function readProgramme(payload: unknown): Programme | null {
  if (!Array.isArray(payload)) {
    throw new Error("Broadcast response is not an array — the endpoint's shape changed.");
  }

  const parsed = payload.map((item, index) => parseBroadcastAct(item, index));

  const stageless = parsed.filter((act) => act.externalVenueName === "");
  if (stageless.length === parsed.length) {
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
