import { describe, expect, it } from "vitest";
import type { Gig } from "@/domain/types";
import { aggregatePastGigPoints, splitArtistGigs } from "./artistMapHistory";

function gig(overrides: Partial<Gig>): Gig {
  return {
    id: "gig-1",
    title: "Gig",
    venueId: "venue-1",
    venueName: "The Venue",
    date: "2026-08-01",
    location: { lat: 53.36, lng: -2 },
    ticketed: false,
    ...overrides,
  };
}

describe("artist map history", () => {
  it("keeps today and future gigs upcoming while excluding cancelled history", () => {
    const result = splitArtistGigs([
      gig({ id: "past", date: "2026-08-28" }),
      gig({ id: "cancelled-past", date: "2026-08-27", cancelled: true }),
      gig({ id: "today", date: "2026-08-29" }),
      gig({ id: "future", date: "2026-09-01" }),
    ], "2026-08-29");

    expect(result.upcoming.map((item) => item.id)).toEqual(["today", "future"]);
    expect(result.past.map((item) => item.id)).toEqual(["past"]);
  });

  it("represents repeat performances at one venue with one counted point", () => {
    const points = aggregatePastGigPoints([
      gig({ id: "one", venueId: "venue-1", venueName: "Hare & Hounds" }),
      gig({ id: "two", venueId: "venue-1", venueName: "Hare & Hounds", date: "2026-08-02" }),
      gig({ id: "three", venueId: "venue-2", venueName: "Market Hall", location: { lat: 53.37, lng: -2.01 } }),
    ]);

    expect(points).toEqual([
      expect.objectContaining({ count: 2, venueName: "Hare & Hounds", lat: 53.36, lng: -2 }),
      expect.objectContaining({ count: 1, venueName: "Market Hall", lat: 53.37, lng: -2.01 }),
    ]);
  });

  it("keeps separately geocoded versions of a venue as separate points", () => {
    const points = aggregatePastGigPoints([
      gig({ id: "old", venueId: "venue-1", location: { lat: 53.36, lng: -2 } }),
      gig({ id: "new", venueId: "venue-1", location: { lat: 53.4, lng: -2.1 } }),
    ]);

    expect(points).toHaveLength(2);
  });
});
