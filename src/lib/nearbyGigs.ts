import { distanceMiles } from "@/domain/geo";
import type { Gig, LatLng } from "@/domain/types";
import { fetchGigsInView, toGig, type BBox } from "./api";

/** A gig hydrated through the batch endpoint, including the primary artist image
 * when one exists. Kept local to discovery so the core Gig contract stays lean. */
export type NearbyGig = Gig & { artistImageUrl: string | undefined };

const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

/** Bounding box that fully contains a radius around a point. The server owns
 * geohash planning; the client only describes the geographic area it needs. */
export function bboxForRadiusMiles(center: LatLng, radiusMiles: number): BBox {
  const safeRadius = Math.max(0.5, radiusMiles);
  const latDelta = safeRadius / 69;
  const cosLat = Math.max(0.15, Math.cos((center.lat * Math.PI) / 180));
  const lngDelta = safeRadius / (69 * cosLat);
  return {
    west: Math.max(-180, center.lng - lngDelta),
    south: Math.max(-90, center.lat - latDelta),
    east: Math.min(180, center.lng + lngDelta),
    north: Math.min(90, center.lat + latDelta),
  };
}

async function fetchEventsBatchWithImages(ids: string[]): Promise<NearbyGig[]> {
  if (ids.length === 0) return [];
  const unique = [...new Set(ids)];
  const chunks: string[][] = [];
  for (let i = 0; i < unique.length; i += 100) chunks.push(unique.slice(i, i + 100));

  const results = await Promise.all(chunks.map(async (eventIds) => {
    const res = await fetch(`${BASE}/api/events/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventIds }),
    });
    if (!res.ok) throw new Error(`POST /api/events/batch → ${res.status}`);
    const data = await res.json() as { events?: Array<Record<string, unknown>> };
    return (data.events || []).map((raw): NearbyGig | null => {
      const gig = toGig(raw as never);
      if (!gig) return null;
      const artist = raw.artist as { profileImageUrl?: string | null } | null | undefined;
      return {
        ...gig,
        artistImageUrl: artist?.profileImageUrl || undefined,
      };
    }).filter((gig): gig is NearbyGig => gig !== null);
  }));

  const byId = new Map<string, NearbyGig>(results.flat().map((gig) => [gig.id, gig]));
  return unique.map((id) => byId.get(id)).filter((gig): gig is NearbyGig => gig !== undefined);
}

/** Fetch one bounded discovery window. The geo endpoint keeps the cold path on
 * geohash indexes at normal radii, and we batch-hydrate only IDs actually inside
 * the requested circle. If a very large bbox makes the server fall back to a
 * whole-window scan, this client-side circle filter still prevents hydrating a
 * national result set. */
export async function fetchNearbyGigs({
  center,
  radiusMiles,
  startDate,
  endDate,
}: {
  center: LatLng;
  radiusMiles: number;
  startDate: string;
  endDate: string;
}): Promise<NearbyGig[]> {
  const bbox = bboxForRadiusMiles(center, radiusMiles);
  const light = await fetchGigsInView(bbox, startDate, endDate);
  const ids = light.events
    .filter((event) => distanceMiles(center, { lat: event.geoLat, lng: event.geoLng }) <= radiusMiles)
    .map((event) => event.id);
  return fetchEventsBatchWithImages(ids);
}
