import { describe, expect, it } from "vitest";
import { describeRepeat, maxUntilIso, seriesDates, weekdayOrdinal, MAX_SERIES_EVENTS } from "../recurrence";

describe("weekdayOrdinal", () => {
  it("maps day-of-month to its weekday occurrence", () => {
    expect(weekdayOrdinal("2026-09-01")).toBe(1);
    expect(weekdayOrdinal("2026-09-08")).toBe(2);
    expect(weekdayOrdinal("2026-09-29")).toBe(5);
  });
});

describe("seriesDates weekly", () => {
  it("expands every week from start to until, inclusive", () => {
    expect(seriesDates("2026-09-01", "weekly", "2026-09-22")).toEqual([
      "2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22",
    ]);
  });
  it("keeps the weekday across the October DST switch", () => {
    const dates = seriesDates("2026-10-20", "weekly", "2026-11-03");
    expect(dates).toEqual(["2026-10-20", "2026-10-27", "2026-11-03"]);
  });
  it("caps at MAX_SERIES_EVENTS even with a far until", () => {
    const dates = seriesDates("2026-09-01", "weekly", "2027-02-28");
    expect(dates.length).toBeLessThanOrEqual(MAX_SERIES_EVENTS);
  });
});

describe("seriesDates fortnightly", () => {
  it("steps 14 days", () => {
    expect(seriesDates("2026-09-04", "fortnightly", "2026-10-02")).toEqual([
      "2026-09-04", "2026-09-18", "2026-10-02",
    ]);
  });
});

describe("seriesDates monthly", () => {
  it("keeps the first-Sunday position", () => {
    // 6 Sep 2026 is the first Sunday of September
    expect(seriesDates("2026-09-06", "monthly", "2026-12-31")).toEqual([
      "2026-09-06", "2026-10-04", "2026-11-01", "2026-12-06",
    ]);
  });
  it("treats a last-weekday start as 'last' in every month", () => {
    // 29 Sep 2026 is the fifth and last Tuesday of September;
    // October's last Tuesday is the 27th, November's the 24th.
    expect(seriesDates("2026-09-29", "monthly", "2026-11-30")).toEqual([
      "2026-09-29", "2026-10-27", "2026-11-24",
    ]);
  });
  it("stops at the until date", () => {
    expect(seriesDates("2026-09-06", "monthly", "2026-10-31")).toEqual([
      "2026-09-06", "2026-10-04",
    ]);
  });
});

describe("maxUntilIso", () => {
  it("is six months out", () => {
    expect(maxUntilIso("2026-09-06")).toBe("2027-03-06");
  });
  it("clamps to shorter months", () => {
    expect(maxUntilIso("2026-08-31")).toBe("2027-02-28");
  });
  it("seriesDates never runs past it", () => {
    const dates = seriesDates("2026-09-06", "monthly", "2099-01-01");
    expect(dates[dates.length - 1] <= maxUntilIso("2026-09-06")).toBe(true);
  });
});

describe("describeRepeat", () => {
  it("reads weekly as the weekday", () => {
    expect(describeRepeat("2026-09-01", "weekly")).toBe("every Tuesday");
  });
  it("reads fortnightly as every other", () => {
    expect(describeRepeat("2026-09-04", "fortnightly")).toBe("every other Friday");
  });
  it("reads monthly with the ordinal", () => {
    expect(describeRepeat("2026-09-06", "monthly")).toBe("the first Sunday of the month");
  });
  it("reads a last-weekday start as last", () => {
    expect(describeRepeat("2026-09-29", "monthly")).toBe("the last Tuesday of the month");
  });
});
