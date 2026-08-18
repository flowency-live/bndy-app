import { describe, expect, it } from "vitest";
import { toFestival, toFestivalSummary, toGig } from "./api";

describe("festival API transforms", () => {
  it("normalises old town fields and de-duplicates venues", () => {
    const summary = toFestivalSummary({
      id: "f1",
      slug: "jazz",
      name: "Jazz",
      startDate: "2026-09-11",
      endDate: "2026-09-13",
      town: "Congleton",
      primaryVenueId: "v1",
      venueIds: ["v1", "v2"],
      actCount: 12,
    });
    expect(summary.location).toBe("Congleton");
    expect(summary.venueIds).toEqual(["v1", "v2"]);
    expect(summary.venueCount).toBe(2);
  });

  it("defaults optional festival collections safely", () => {
    const festival = toFestival({
      id: "f1",
      slug: "jazz",
      name: "Jazz",
      startDate: "2026-09-11",
    });
    expect(festival.endDate).toBe("2026-09-11");
    expect(festival.stages).toEqual([]);
    expect(festival.lineup).toEqual([]);
    expect(festival.socialMediaUrls).toEqual([]);
  });

  it("preserves festival membership on normal gigs", () => {
    const gig = toGig({
      id: "e1",
      title: "Quartet",
      date: "2026-09-11",
      venueId: "v1",
      venueName: "Swiftys",
      geoLat: 53.16,
      geoLng: -2.2,
      festivalId: "f1",
      festivalName: "Jazz",
      festivalSlug: "jazz",
      stageId: "stage-1",
      billing: "headline",
      billingOrder: 1,
    });
    expect(gig).toMatchObject({
      festivalId: "f1",
      festivalName: "Jazz",
      festivalSlug: "jazz",
      stageId: "stage-1",
      billing: "headline",
      billingOrder: 1,
    });
  });
});
