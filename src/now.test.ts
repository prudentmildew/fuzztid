import { describe, expect, it } from "vitest";
import { dayStanding, osloDate, osloMinutes, todayFestivalDate } from "./now.ts";

describe("osloDate", () => {
  it("returns the Oslo date for a CEST noon instant on a Høstsabbat day", () => {
    // UTC 10:00 = Oslo 12:00 CEST on Fri 23 October 2026 (DST ends 25 Oct).
    expect(osloDate(new Date("2026-10-23T10:00:00Z"))).toBe("2026-10-23");
  });

  it("rolls forward to the next Oslo date when UTC is late evening", () => {
    // UTC 22:30 Fri 23 Oct = Oslo 00:30 Sat 24 Oct (CEST = UTC+2)
    expect(osloDate(new Date("2026-10-23T22:30:00Z"))).toBe("2026-10-24");
  });

  it("keeps the same Oslo date when UTC has not yet rolled past midnight Oslo", () => {
    // UTC 21:59 Fri 23 Oct = Oslo 23:59 Fri 23 Oct
    expect(osloDate(new Date("2026-10-23T21:59:00Z"))).toBe("2026-10-23");
  });

  it("handles a winter CET date (UTC+1, no DST in January)", () => {
    // UTC 23:30 on 2026-01-15 = Oslo 00:30 on 2026-01-16
    expect(osloDate(new Date("2026-01-15T23:30:00Z"))).toBe("2026-01-16");
    // UTC 22:30 on 2026-01-15 = Oslo 23:30 on 2026-01-15 (still same day)
    expect(osloDate(new Date("2026-01-15T22:30:00Z"))).toBe("2026-01-15");
  });
});

describe("osloMinutes", () => {
  it("returns 720 (12:00) for UTC 10:00 on a CEST date", () => {
    expect(osloMinutes(new Date("2026-10-23T10:00:00Z"))).toBe(720);
  });

  it("returns 90 (01:30) for UTC 23:30 on a CEST date (wraps past midnight)", () => {
    expect(osloMinutes(new Date("2026-10-23T23:30:00Z"))).toBe(90);
  });

  it("returns 120 (02:00) for UTC 00:00 on a CEST date", () => {
    expect(osloMinutes(new Date("2026-10-23T00:00:00Z"))).toBe(120);
  });

  it("returns 0 for an instant exactly at Oslo midnight", () => {
    // 00:00 Oslo CEST on 23 October = UTC 22:00 on 22 October
    expect(osloMinutes(new Date("2026-10-22T22:00:00Z"))).toBe(0);
  });

  it("returns the correct minutes on a CET (winter) instant", () => {
    // UTC 21:30 on 15 Jan = Oslo 22:30 (CET = UTC+1)
    expect(osloMinutes(new Date("2026-01-15T21:30:00Z"))).toBe(1350);
  });
});

describe("todayFestivalDate", () => {
  const festival = ["2026-10-23", "2026-10-24"];

  it("returns the matching festival date when today (Oslo) is one of them", () => {
    // UTC 10:00 on 24 Oct = Oslo 12:00 on 24 Oct
    expect(todayFestivalDate(festival, new Date("2026-10-24T10:00:00Z"))).toBe("2026-10-24");
  });

  it("matches the Friday opening day", () => {
    expect(todayFestivalDate(festival, new Date("2026-10-23T18:00:00Z"))).toBe("2026-10-23");
  });

  it("returns null when Oslo date is not in the list", () => {
    // 1 August 2026 — well before the festival
    expect(todayFestivalDate(festival, new Date("2026-08-01T10:00:00Z"))).toBeNull();
  });

  it("returns null for an empty festivalDates array", () => {
    expect(todayFestivalDate([], new Date("2026-10-23T10:00:00Z"))).toBeNull();
  });

  it("returns null when the festival list contains dates but none match today", () => {
    // Now is a day later than any festival date
    expect(todayFestivalDate(festival, new Date("2026-10-25T10:00:00Z"))).toBeNull();
  });
});

describe("dayStanding", () => {
  // Oslo noon on Saturday 24 October 2026, the second Høstsabbat day.
  const saturdayNoon = new Date("2026-10-24T10:00:00Z");

  it("calls the current Oslo date today", () => {
    expect(dayStanding("2026-10-24", saturdayNoon)).toBe("today");
  });

  it("calls an earlier date past and a later date future", () => {
    expect(dayStanding("2026-10-23", saturdayNoon)).toBe("past");
    expect(dayStanding("2026-10-25", saturdayNoon)).toBe("future");
  });

  it("crosses month and year boundaries on the string compare", () => {
    expect(dayStanding("2026-11-01", saturdayNoon)).toBe("future");
    expect(dayStanding("2025-12-31", saturdayNoon)).toBe("past");
    expect(dayStanding("2027-01-01", saturdayNoon)).toBe("future");
  });

  it("reads the Oslo date, not the UTC one, either side of midnight", () => {
    // UTC 22:30 Fri 23 Oct = Oslo 00:30 Sat 24 Oct: the Friday pane has
    // already become the past even though it is still Friday in UTC.
    const justPastOsloMidnight = new Date("2026-10-23T22:30:00Z");
    expect(dayStanding("2026-10-23", justPastOsloMidnight)).toBe("past");
    expect(dayStanding("2026-10-24", justPastOsloMidnight)).toBe("today");
  });
});
