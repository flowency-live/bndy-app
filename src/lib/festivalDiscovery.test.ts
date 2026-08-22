import { describe, expect, it } from "vitest";
import type { FestivalSummary, Venue } from "@/domain/types";
import { toFestivalDiscoverySummary } from "./festivalDiscovery";
import {
  festivalVenueFallbackRequired,
  festivalVenueLocationMap,
} from "@/features/festivals/festivalUtils";

describe("festival discovery venue points", () => {
  it("normalises embedded venue points and drops malformed geometry", () => {
    const festival = toFestivalDiscoverySummary({
      id: "f1",
      slug: "jazz",
      name: "Jazz",
      startDate: "2026-09-11",
      venueIds: ["v1", "v2"],
      venuePoints: [
        { id: "v1", city: "Congleton", lat: 53.16, lng: -2.21 },
        { id: "v2", city: "Broken", lat: "nope", lng: -2.22 },
      ],
    });

    expect(festival.venuePoints).toEqual([
      { id: "v1", city: "Congleton", location: { lat: 53.16, lng: -2.21 } },
    ]);
  });

  it("distinguishes an older response from a valid empty venuePoints response", () => {
    const oldResponse = toFestivalDiscoverySummary({
      id: "old", slug: "old", name: "Old", startDate: "2026-09-11", venueIds: ["v1"],
    });
    const currentResponse = toFestivalDiscoverySummary({
      id: "new", slug: "new", name: "New", startDate: "2026-09-11", venueIds: [], venuePoints: [],
    });

    expect(oldResponse.venuePoints).toBeUndefined();
    expect(currentResponse.venuePoints).toEqual([]);
    expect(festivalVenueFallbackRequired([oldResponse])).toBe(true);
    expect(festivalVenueFallbackRequired([currentResponse])).toBe(false);
  });

  it("prefers embedded points over compatibility venue catalogue entries", () => {
    const festival: FestivalSummary = {
      id: "f1", slug: "jazz", name: "Jazz", startDate: "2026-09-11", endDate: "2026-09-11",
      venueIds: ["v1"],
      venuePoints: [{ id: "v1", city: "Current", location: { lat: 53.16, lng: -2.21 } }],
    };
    const staleVenue: Venue = {
      id: "v1", name: "Venue", city: "Stale", location: { lat: 1, lng: 2 },
    };

    expect(festivalVenueLocationMap([festival], [staleVenue]).get("v1")).toEqual(festival.venuePoints?.[0]);
  });
});