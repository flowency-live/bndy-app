import { describe, expect, it } from "vitest";
import { toArtist, toGig, toVenue } from "../api";

describe("toGig", () => {
  it("maps a DTO to a domain Gig", () => {
    const g = toGig({ id: "e1", title: "Rock Night", date: "2026-07-05", startTime: "20:00", venueId: "v1", venueName: "Blue Moon", venue: { city: "Crewe" }, artistId: "a1", artistName: "The Rockers", geoLat: 53.06, geoLng: -2.44, ticketed: true })!;
    expect(g.id).toBe("e1");
    expect(g.title).toBe("Rock Night");
    expect(g.venueCity).toBe("Crewe");
    expect(g.location).toEqual({ lat: 53.06, lng: -2.44 });
    expect(g.ticketed).toBe(true);
  });
  it("falls back title → name → artistName", () => {
    expect(toGig({ id: "1", name: "Legacy", date: "2026-07-05", venueId: "v", geoLat: 1, geoLng: 2 })!.title).toBe("Legacy");
  });
  it("drops gigs without coordinates", () => {
    expect(toGig({ id: "1", date: "2026-07-05", venueId: "v" })).toBeNull();
  });
});

describe("toVenue", () => {
  it("normalises location_object", () => {
    expect(toVenue({ id: "v", name: "X", location_object: { lat: 53, lng: -2 } })!.location).toEqual({ lat: 53, lng: -2 });
  });
  it("normalises legacy lat/lng", () => {
    expect(toVenue({ id: "v", name: "X", latitude: 53, longitude: -2 })!.location).toEqual({ lat: 53, lng: -2 });
  });
  it("drops venues without coordinates", () => {
    expect(toVenue({ id: "v", name: "X" })).toBeNull();
  });
  it("classifies socials", () => {
    const v = toVenue({ id: "v", name: "X", latitude: 1, longitude: 2, socialMediaUrls: ["https://facebook.com/x"] })!;
    expect(v.socials?.[0]).toEqual({ platform: "facebook", url: "https://facebook.com/x" });
  });
});

describe("toArtist", () => {
  it("prefers artistType over artist_type and gathers socials", () => {
    const a = toArtist({ id: "a", name: "Band", artist_type: "band", artistType: "duo", instagramUrl: "https://instagram.com/b" });
    expect(a.artistType).toBe("duo");
    expect(a.socials?.some((s) => s.platform === "instagram")).toBe(true);
  });
});
