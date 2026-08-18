import { describe, expect, it } from "vitest";
import type { FestivalSummary, Gig } from "@/domain/types";
import { datesForFestival, festivalCountLine, festivalDateRange, festivalStatus, groupFestivalGigs } from "./festivalUtils";

const festival: FestivalSummary = {
  id: "fest-1",
  slug: "town-jazz",
  name: "Town Jazz Festival",
  startDate: "2026-09-11",
  endDate: "2026-09-13",
  location: "Congleton",
  venueIds: ["v1", "v2"],
  gigCount: 3,
  venueCount: 2,
};

function gig(id: string, date: string, startTime?: string, billingOrder?: number): Gig {
  return {
    id,
    title: id,
    venueId: "v1",
    venueName: "Venue",
    date,
    startTime,
    location: { lat: 53.16, lng: -2.2 },
    ticketed: false,
    billingOrder,
  };
}

describe("festivalUtils", () => {
  it("formats a compact multi-day date range", () => {
    expect(festivalDateRange("2026-09-11", "2026-09-13")).toBe("11–13 Sep 2026");
  });

  it("identifies active festivals", () => {
    expect(festivalStatus(festival, "2026-09-12")).toBe("On now");
  });

  it("uses actual gig and venue counts when supplied", () => {
    expect(festivalCountLine(festival)).toBe("3 gigs · 2 venues");
  });

  it("expands every day in a short festival", () => {
    expect(datesForFestival(festival)).toEqual(["2026-09-11", "2026-09-12", "2026-09-13"]);
  });

  it("groups by day and sorts timed gigs before unknown times", () => {
    const groups = groupFestivalGigs([
      gig("late", "2026-09-11", "21:00"),
      gig("unknown", "2026-09-11"),
      gig("early", "2026-09-11", "18:30"),
      gig("day-two", "2026-09-12", "19:00"),
    ]);
    expect(groups.map((g) => g.date)).toEqual(["2026-09-11", "2026-09-12"]);
    expect(groups[0].gigs.map((g) => g.id)).toEqual(["early", "late", "unknown"]);
  });

  it("uses billing order as the tie breaker for matching times", () => {
    const groups = groupFestivalGigs([
      gig("second", "2026-09-11", "20:00", 2),
      gig("first", "2026-09-11", "20:00", 1),
    ]);
    expect(groups[0].gigs.map((g) => g.id)).toEqual(["first", "second"]);
  });
});
