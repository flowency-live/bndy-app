import { describe, expect, it } from "vitest";
import { matchesMapDate, mapDateLabel, weekendDates, nextDays, selFromDay } from "../mapdate";

const TODAY = "2026-07-03"; // Friday

describe("weekendDates", () => {
  it("this weekend = Fri/Sat/Sun of the current week", () => {
    expect(weekendDates("this", TODAY)).toEqual(["2026-07-03", "2026-07-04", "2026-07-05"]);
  });
  it("next weekend = +7 days", () => {
    expect(weekendDates("next", TODAY)).toEqual(["2026-07-10", "2026-07-11", "2026-07-12"]);
  });
  it("still resolves the current weekend on a Sunday", () => {
    expect(weekendDates("this", "2026-07-05")).toEqual(["2026-07-03", "2026-07-04", "2026-07-05"]);
  });
});

describe("matchesMapDate", () => {
  it("today matches only today", () => {
    expect(matchesMapDate(TODAY, { kind: "today" }, TODAY)).toBe(true);
    expect(matchesMapDate("2026-07-04", { kind: "today" }, TODAY)).toBe(false);
  });
  it("date matches that day", () => {
    expect(matchesMapDate("2026-07-09", { kind: "date", date: "2026-07-09" }, TODAY)).toBe(true);
  });
  it("weekend matches any of its three days", () => {
    expect(matchesMapDate("2026-07-11", { kind: "weekend", which: "next" }, TODAY)).toBe(true);
    expect(matchesMapDate("2026-07-13", { kind: "weekend", which: "next" }, TODAY)).toBe(false);
  });
});

describe("labels + helpers", () => {
  it("labels", () => {
    expect(mapDateLabel({ kind: "today" }, TODAY)).toBe("Today");
    expect(mapDateLabel({ kind: "date", date: "2026-07-05" }, TODAY)).toBe("Sun 5 Jul");
    expect(mapDateLabel({ kind: "weekend", which: "next" }, TODAY)).toBe("Next weekend");
  });
  it("nextDays returns N days from today", () => {
    expect(nextDays(TODAY, 3)).toEqual(["2026-07-03", "2026-07-04", "2026-07-05"]);
  });
  it("selFromDay collapses today", () => {
    expect(selFromDay(TODAY, TODAY)).toEqual({ kind: "today" });
    expect(selFromDay("2026-07-06", TODAY)).toEqual({ kind: "date", date: "2026-07-06" });
  });
});
