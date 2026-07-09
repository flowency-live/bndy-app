import { describe, expect, it } from "vitest";
import { addDaysISO, inWhenRange, prettyDate } from "../dates";

const TODAY = "2026-07-03"; // a Friday

describe("prettyDate", () => {
  it("labels today as Tonight", () => expect(prettyDate(TODAY, TODAY)).toBe("Tonight"));
  it("labels the next day as Tomorrow", () => expect(prettyDate(addDaysISO(TODAY, 1), TODAY)).toBe("Tomorrow"));
  it("formats a further date", () => expect(prettyDate("2026-07-08", TODAY)).toBe("Wed 8 Jul"));
});

describe("inWhenRange", () => {
  it("excludes past dates", () => expect(inWhenRange("2026-07-02", "all", TODAY)).toBe(false));
  it("tonight = today only", () => {
    expect(inWhenRange(TODAY, "tonight", TODAY)).toBe(true);
    expect(inWhenRange(addDaysISO(TODAY, 1), "tonight", TODAY)).toBe(false);
  });
  it("week = today..+6", () => {
    expect(inWhenRange(addDaysISO(TODAY, 6), "week", TODAY)).toBe(true);
    expect(inWhenRange(addDaysISO(TODAY, 7), "week", TODAY)).toBe(false);
  });
  it("weekend = upcoming Fri/Sat/Sun", () => {
    expect(inWhenRange("2026-07-03", "weekend", TODAY)).toBe(true); // Fri
    expect(inWhenRange("2026-07-04", "weekend", TODAY)).toBe(true); // Sat
    expect(inWhenRange("2026-07-05", "weekend", TODAY)).toBe(true); // Sun
    expect(inWhenRange("2026-07-06", "weekend", TODAY)).toBe(false); // Mon
  });
});
