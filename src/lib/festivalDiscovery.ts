import type { FestivalSummary } from "@/domain/types";
import { toFestivalSummary } from "./api";

const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

type RawVenuePoint = {
  id?: unknown;
  city?: unknown;
  lat?: unknown;
  lng?: unknown;
};

/** Preserve the standard festival transform while accepting the additive
 * lightweight venue geometry used by discovery surfaces. `undefined` is
 * intentional: it identifies an older cached/API response so callers can use
 * the venue-catalogue compatibility fallback. */
export function toFestivalDiscoverySummary(raw: Record<string, unknown>): FestivalSummary {
  const summary = toFestivalSummary(raw as never);
  const rawPoints = raw.venuePoints;
  if (!Array.isArray(rawPoints)) return summary;

  const venuePoints = rawPoints.flatMap((candidate) => {
    const point = candidate as RawVenuePoint;
    const lat = Number(point.lat);
    const lng = Number(point.lng);
    if (typeof point.id !== "string" || !point.id || !Number.isFinite(lat) || !Number.isFinite(lng)) return [];
    return [{
      id: point.id,
      city: typeof point.city === "string" && point.city ? point.city : undefined,
      location: { lat, lng },
    }];
  });

  return { ...summary, venuePoints };
}

export async function fetchFestivalDiscoverySummaries(params?: { startDate?: string; endDate?: string }): Promise<FestivalSummary[]> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  const path = `/api/festivals/public${q.toString() ? `?${q}` : ""}`;
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  const data = await res.json() as { festivals?: Array<Record<string, unknown>> };
  return (data.festivals || [])
    .map(toFestivalDiscoverySummary)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
}