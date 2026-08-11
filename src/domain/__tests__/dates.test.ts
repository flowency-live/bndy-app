import { describe, expect, it } from "vitest";
import { addDaysISO, inWhenRange, isSetWindow, isTonight, prettyDate, setTimeLabel, spanMinutes } from "../dates";

const TODAY = "2026-07-03"; // a Friday

describe("prettyDate", () => {
  it("labels an evening gig today as Tonight", () => expect(prettyDate(TODAY, "20:00", TODAY)).toBe("Tonight"));
  it("labels an afternoon gig today as Today", () => expect(prettyDate(TODAY, "14:00", TODAY)).toBe("Today"));
  it("labels a gig today with no start time as Today", () => expect(prettyDate(TODAY, undefined, TODAY)).toBe("Today"));
  it("labels the next day as Tomorrow", () => expect(prettyDate(addDaysISO(TODAY, 1), "20:00", TODAY)).toBe("Tomorrow"));
  it("formats a further date", () => expect(prettyDate("2026-07-08", "20:00", TODAY)).toBe("Wed 8 Jul"));
});

describe("isTonight", () => {
  it("is true only for an evening start today", () => {
    expect(isTonight(TODAY, "17:00", TODAY)).toBe(true);
    expect(isTonight(TODAY, "23:30", TODAY)).toBe(true);
  });
  it("is false before the evening cutoff", () => expect(isTonight(TODAY, "16:59", TODAY)).toBe(false));
  it("is false with no start time", () => expect(isTonight(TODAY, undefined, TODAY)).toBe(false));
  it("is false on another day", () => expect(isTonight(addDaysISO(TODAY, 1), "20:00", TODAY)).toBe(false));
});

describe("set time versus opening window", () => {
  it("treats a normal set as a range", () => expect(isSetWindow("20:00", "22:30")).toBe(true));
  it("treats a six-hour span as an opening window", () => expect(isSetWindow("14:00", "20:00")).toBe(false));
  it("wraps past midnight", () => expect(spanMinutes("21:00", "00:30")).toBe(210));
  it("shows a range for a real set", () => expect(setTimeLabel("20:00", "22:30")).toEqual({ label: "Time", value: "8pm – 10:30pm" }));
  it("shows the start only for an opening window", () => expect(setTimeLabel("14:00", "20:00")).toEqual({ label: "From", value: "2pm" }));
  it("shows the start only when there is no end", () => expect(setTimeLabel("20:00")).toEqual({ label: "From", value: "8pm" }));
  it("returns null with no start", () => expect(setTimeLabel(undefined, "22:00")).toBeNull());
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
