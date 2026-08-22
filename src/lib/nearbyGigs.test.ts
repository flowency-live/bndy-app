import { describe, expect, it } from "vitest";
import { bboxForRadiusMiles } from "./nearbyGigs";

describe("nearby gig discovery bounds", () => {
  it("builds a box containing a five mile search around Stoke", () => {
    const box = bboxForRadiusMiles({ lat: 53.002, lng: -2.179 }, 5);
    expect(box.south).toBeLessThan(53.002);
    expect(box.north).toBeGreaterThan(53.002);
    expect(box.west).toBeLessThan(-2.179);
    expect(box.east).toBeGreaterThan(-2.179);
    expect(box.north - box.south).toBeCloseTo(10 / 69, 4);
  });

  it("widens longitude at UK latitude so the circle is never clipped", () => {
    const equator = bboxForRadiusMiles({ lat: 0, lng: 0 }, 10);
    const uk = bboxForRadiusMiles({ lat: 53, lng: 0 }, 10);
    expect(uk.east - uk.west).toBeGreaterThan(equator.east - equator.west);
  });

  it("clamps boxes at world coordinate limits", () => {
    const box = bboxForRadiusMiles({ lat: 89.9, lng: 179.9 }, 100);
    expect(box.north).toBe(90);
    expect(box.east).toBe(180);
    expect(box.south).toBeGreaterThanOrEqual(-90);
    expect(box.west).toBeGreaterThanOrEqual(-180);
  });
});
