import { describe, expect, it } from "vitest";
import type { FestivalSummary, Gig } from "@/domain/types";
import { datesForFestival, dayPeriod, festivalCountLine, festivalDateRange, festivalProximity, festivalStatus, groupFestivalGigs } from "./festivalUtils";
import { festivalMonogram } from "./FestivalPosterFallback";

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

describe("dayPeriod", () => {
  it("splits the day at noon and the shared evening boundary", () => {
    expect(dayPeriod("09:30")).toBe("morning");
    expect(dayPeriod("12:00")).toBe("afternoon");
    expect(dayPeriod("16:59")).toBe("afternoon");
    expect(dayPeriod("17:00")).toBe("evening");
    expect(dayPeriod("23:45")).toBe("evening");
  });

  it("no start time is its own bucket, never a guess", () => {
    expect(dayPeriod(undefined)).toBe("tba");
  });
});

describe("festivalMonogram", () => {
  it("drops stop words and year, keeps three initials", () => {
    expect(festivalMonogram("Congleton Jazz & Blues Festival 2026")).toBe("CJB");
    expect(festivalMonogram("Bridgnorth Music & Arts Festival 2026")).toBe("BMA");
  });

  it("short names keep what they have", () => {
    expect(festivalMonogram("Tigerfest 2026")).toBe("T");
  });
});

describe("festivalProximity", () => {
  const venue = (id: string, lat: number, lng: number, city?: string) =>
    [id, { id, name: id, city, location: { lat, lng } } as import("@/domain/types").Venue] as const;

  it("distance is to the NEAREST venue, not the first", () => {
    const vmap = new Map([venue("v1", 54.0, -2.2, "Far"), venue("v2", 53.17, -2.21, "Near")]);
    const p = festivalProximity(festival, vmap, { lat: 53.16, lng: -2.2 });
    expect(p.distanceMiles).toBeLessThan(2);
  });

  it("one town reads as the town", () => {
    const vmap = new Map([venue("v1", 53.16, -2.2, "Congleton"), venue("v2", 53.17, -2.21, "Congleton")]);
    expect(festivalProximity(festival, vmap).scope).toBe("Congleton");
  });

  it("several towns read as a count", () => {
    const vmap = new Map([venue("v1", 53.16, -2.2, "Congleton"), venue("v2", 53.4, -2.9, "Liverpool")]);
    expect(festivalProximity(festival, vmap).scope).toBe("2 towns");
  });

  it("a 90 mile spread reads UK wide", () => {
    const vmap = new Map([venue("v1", 51.5, -0.1, "London"), venue("v2", 53.48, -2.24, "Manchester")]);
    expect(festivalProximity(festival, vmap).scope).toBe("UK wide");
  });

  it("no resolved venues returns an empty result, never a guess", () => {
    expect(festivalProximity(festival, new Map(), { lat: 53, lng: -2 })).toEqual({});
  });

  it("no user location still yields a scope", () => {
    const vmap = new Map([venue("v1", 53.16, -2.2, "Congleton")]);
    const p = festivalProximity(festival, vmap);
    expect(p.scope).toBe("Congleton");
    expect(p.distanceMiles).toBeUndefined();
  });
});
