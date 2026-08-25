// Pure grid-position math, source-agnostic and clock-agnostic: no Intl, no
// Date. Both Days share one vertical time origin (ADR-0012, ported by
// reference) so scrolling to 21:00 on either pane compares like with like.

import type { Schedule } from "./schedule.ts";

export type TimeOrigin = {
  startMin: number;
  endMin: number;
};

export function sharedOrigin(schedule: Schedule): TimeOrigin {
  let startMin = Number.POSITIVE_INFINITY;
  let endMin = Number.NEGATIVE_INFINITY;
  for (const day of schedule.days) {
    if (day.start_min < startMin) startMin = day.start_min;
    if (day.end_min > endMin) endMin = day.end_min;
  }
  return { startMin, endMin };
}

export function pxFromMin(min: number, origin: TimeOrigin, pxPerMinute: number): number {
  return (min - origin.startMin) * pxPerMinute;
}

// Hour ticks (#31, story 12): px from the grid's top edge to the first whole
// hour *strictly* after the origin starts. Strictly, because the origin is
// the top edge — a tick there would be a line on the edge, and an origin
// that happens to start on the hour (the 2025 fixture's 15:00) must not
// become load-bearing.
export function hourTickOffsetPx(origin: TimeOrigin, pxPerMinute: number): number {
  const firstHourMin = (Math.floor(origin.startMin / 60) + 1) * 60;
  return (firstHourMin - origin.startMin) * pxPerMinute;
}
