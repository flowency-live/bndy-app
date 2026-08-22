import { describe, expect, it } from "vitest";
import { needsDirectDateRangeFetch } from "./gigDiscoveryWindow";

describe("needsDirectDateRangeFetch", () => {
  it("does not fetch directly without a selected date range", () => {
    expect(needsDirectDateRangeFetch(null, "2026-11-19")).toBe(false);
  });

  it("uses already-loaded sequential coverage when the selection fits inside it", () => {
    expect(needsDirectDateRangeFetch({ start: "2026-10-01", end: "2026-10-03" }, "2026-11-19")).toBe(false);
    expect(needsDirectDateRangeFetch({ start: "2026-11-19", end: "2026-11-19" }, "2026-11-19")).toBe(false);
  });

  it("fetches only the selected range when it extends beyond loaded coverage", () => {
    expect(needsDirectDateRangeFetch({ start: "2026-12-12", end: "2026-12-13" }, "2026-11-19")).toBe(true);
  });
});