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

  // R5 audit tests
  it("resolved ticketing takes precedence over legacy fields", () => {
    const g = toGig({
      id: "1", date: "2026-07-05", venueId: "v", geoLat: 1, geoLng: 2,
      ticketed: false, ticketUrl: "https://old.com",
      ticketing: { isTicketed: true, source: "venue", ticketUrl: "https://new.com", price: "£10" },
    })!;
    expect(g.ticketed).toBe(true);
    expect(g.ticketUrl).toBe("https://new.com");
    expect(g.ticketing?.price).toBe("£10");
  });

  it("recognises open mic from type field", () => {
    const g = toGig({ id: "1", date: "2026-07-05", venueId: "v", geoLat: 1, geoLng: 2, type: "open-mic" })!;
    expect(g.isOpenMic).toBe(true);
  });

  it("falls back venueName from nested venue object", () => {
    // This was a production bug: map cards showed "Venue TBC" because venueName was missing
    const g = toGig({ id: "1", date: "2026-07-05", venueId: "v", geoLat: 1, geoLng: 2, venue: { name: "The Blue Moon", city: "Crewe" } })!;
    expect(g.venueName).toBe("The Blue Moon");
    expect(g.venueCity).toBe("Crewe");
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

  it("maps media providers and all availability settings", () => {
    const a = toArtist({
      id: "a",
      name: "Band",
      youtubeUrl: "https://youtu.be/abcdefghijk",
      soundcloudUrl: "https://soundcloud.com/example/live",
      bandcampUrl: "https://example.bandcamp.com/album/live",
      publishAvailability: true,
      availabilityMode: "free_weekends",
      contactMethod: "whatsapp",
      phoneNumber: "+441234567890",
      whatsappNumber: "+447700900000",
    });

    expect(a.socials).toEqual(expect.arrayContaining([
      { platform: "youtube", url: "https://youtu.be/abcdefghijk" },
      { platform: "soundcloud", url: "https://soundcloud.com/example/live" },
      { platform: "bandcamp", url: "https://example.bandcamp.com/album/live" },
    ]));
    expect(a).toMatchObject({
      publishAvailability: true,
      availabilityMode: "free_weekends",
      contactMethod: "whatsapp",
      phoneNumber: "+441234567890",
      whatsappNumber: "+447700900000",
    });
  });

  it("prefers a managed media field over an older generic provider link", () => {
    const artist = toArtist({
      id: "artist-2",
      name: "Managed media",
      youtubeUrl: "https://youtu.be/abcdefghijk",
      socialMediaUrls: ["https://youtu.be/lmnopqrstuv"],
    });

    expect(artist.socials?.filter((link) => link.platform === "youtube")[0]).toEqual({
      platform: "youtube",
      url: "https://youtu.be/abcdefghijk",
    });
  });
});
