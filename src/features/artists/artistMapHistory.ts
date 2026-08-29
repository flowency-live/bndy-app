import type { Gig } from "@/domain/types";

export const ARTIST_HISTORY_START_DATE = "1900-01-01";

export interface PastVenuePoint {
  id: string;
  lat: number;
  lng: number;
  count: number;
  venueName: string;
}

export function splitArtistGigs(gigs: Gig[], today: string): { upcoming: Gig[]; past: Gig[] } {
  return {
    upcoming: gigs.filter((gig) => gig.date >= today),
    past: gigs.filter((gig) => gig.date < today && !gig.cancelled),
  };
}

export function aggregatePastGigPoints(gigs: Gig[]): PastVenuePoint[] {
  const points = new Map<string, PastVenuePoint>();

  for (const gig of gigs) {
    const lat = Number(gig.location?.lat);
    const lng = Number(gig.location?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const coordinateKey = `${lat.toFixed(6)}:${lng.toFixed(6)}`;
    const key = `${gig.venueId || "venue"}:${coordinateKey}`;
    const existing = points.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }

    points.set(key, {
      id: `past-${key}`,
      lat,
      lng,
      count: 1,
      venueName: gig.venueName || "this venue",
    });
  }

  return [...points.values()].sort((a, b) => b.count - a.count || a.venueName.localeCompare(b.venueName));
}
