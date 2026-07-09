import { describe, expect, it } from "vitest";
import { distanceMiles, formatDistance } from "../geo";

describe("distanceMiles", () => {
  it("is ~0 for the same point", () => {
    expect(distanceMiles({ lat: 53, lng: -2 }, { lat: 53, lng: -2 })).toBeCloseTo(0, 5);
  });
  it("matches a known distance (Stoke → Manchester ≈ 30 mi)", () => {
    const d = distanceMiles({ lat: 53.002, lng: -2.179 }, { lat: 53.4808, lng: -2.2426 });
    expect(d).toBeGreaterThan(28);
    expect(d).toBeLessThan(36);
  });
  it("is symmetric", () => {
    const a = { lat: 51.5, lng: -0.12 }, b = { lat: 53.4, lng: -2.24 };
    expect(distanceMiles(a, b)).toBeCloseTo(distanceMiles(b, a), 6);
  });
});

describe("formatDistance", () => {
  it("says 'here' when very close", () => expect(formatDistance(0.3)).toBe("here"));
  it("keeps a decimal under 10 mi", () => expect(formatDistance(4.24)).toBe("4.2 mi"));
  it("rounds above 10 mi", () => expect(formatDistance(23.6)).toBe("24 mi"));
});
