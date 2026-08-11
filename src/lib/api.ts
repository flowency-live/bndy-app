// bndy API client + DTO→domain transforms. All I/O lives here.

import type { Artist, AvailabilityDate, Gig, ResolvedTicketing, SocialLink, SocialPlatform, Venue } from "@/domain/types";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

async function get<T>(path: string, revalidate = 60): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate } });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

/* ---------- transforms ---------- */
function classify(url: string): SocialPlatform {
  const u = url.toLowerCase();
  if (u.includes("facebook")) return "facebook";
  if (u.includes("instagram")) return "instagram";
  if (u.includes("spotify")) return "spotify";
  if (u.includes("youtube")) return "youtube";
  if (u.includes("twitter") || u.includes("x.com")) return "x";
  return "website";
}
function toSocials(dto: Record<string, unknown>): SocialLink[] {
  const out: SocialLink[] = [];
  const seen = new Set<string>();
  const push = (url?: unknown) => {
    if (typeof url !== "string" || !url.startsWith("http") || seen.has(url)) return;
    seen.add(url);
    out.push({ platform: classify(url), url });
  };
  const arr = (dto.socialMediaUrls ?? dto.socialMediaURLs) as unknown[] | undefined;
  if (Array.isArray(arr)) arr.forEach((x) => push(typeof x === "string" ? x : (x as { url?: string })?.url));
  ["facebookUrl", "instagramUrl", "websiteUrl", "youtubeUrl", "spotifyUrl", "twitterUrl", "website"].forEach((k) => push(dto[k]));
  return out;
}

interface TicketingDTO {
  isTicketed: boolean;
  source: 'event' | 'venue' | 'none';
  price?: string;
  ticketUrl?: string;
  ticketInformation?: string;
}
interface GigDTO {
  id: string; title?: string; name?: string; date: string; startTime?: string; endTime?: string;
  venueId: string; venueName?: string; venueCity?: string; venue?: { name?: string; city?: string };
  artistId?: string; artistName?: string; geoLat?: number; geoLng?: number;
  ticketed?: boolean; ticketUrl?: string; ticketing?: TicketingDTO; isOpenMic?: boolean; cancelled?: boolean;
  /** community-created open mics carry type 'open-mic' rather than an isOpenMic attribute */
  type?: string;
}
export function toGig(e: GigDTO): Gig | null {
  if (typeof e.geoLat !== "number" || typeof e.geoLng !== "number") return null;
  // Use resolved ticketing if available, fall back to legacy fields
  const ticketing = e.ticketing;
  const isTicketed = ticketing?.isTicketed ?? !!e.ticketed;
  const ticketUrl = ticketing?.ticketUrl ?? e.ticketUrl;
  const resolved: ResolvedTicketing | undefined = ticketing ? {
    isTicketed: ticketing.isTicketed,
    source: ticketing.source,
    price: ticketing.price,
    ticketUrl: ticketing.ticketUrl,
    ticketInformation: ticketing.ticketInformation,
  } : undefined;
  return {
    id: e.id,
    title: e.title || e.name || e.artistName || "Live music",
    artistId: e.artistId,
    artistName: e.artistName,
    venueId: e.venueId,
    // POST /api/events/batch (the map's tap handler) returns a NESTED `venue` object and
    // no flat `venueName`. `venueCity` already had this fallback; `venueName` did not, so
    // every map card rendered "Venue TBC" while the city beside it was correct. Venue and
    // artist pages were unaffected because they use endpoints that do denormalise the name.
    venueName: e.venueName || e.venue?.name || "",
    venueCity: e.venueCity || e.venue?.city,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: { lat: e.geoLat, lng: e.geoLng },
    ticketed: isTicketed,
    ticketUrl,
    ticketing: resolved,
    isOpenMic: e.isOpenMic || e.type === "open-mic" || undefined,
    cancelled: !!e.cancelled,
  };
}

interface VenueDTO {
  id: string; name: string; address?: string; city?: string | null; postcode?: string;
  location_object?: { lat: number; lng: number }; latitude?: number; longitude?: number;
  website?: string; profileImageUrl?: string | null;
  socialMediaUrls?: string[]; facebookUrl?: string; instagramUrl?: string;
  standardTicketed?: boolean; standardTicketUrl?: string; standardTicketInformation?: string;
}
export function toVenue(v: VenueDTO): Venue | null {
  const loc = v.location_object ?? (typeof v.latitude === "number" && typeof v.longitude === "number" ? { lat: v.latitude, lng: v.longitude } : null);
  if (!loc) return null;
  return {
    id: v.id, name: v.name, address: v.address, city: v.city ?? undefined, postcode: v.postcode,
    location: loc, website: v.website, profileImageUrl: v.profileImageUrl,
    socials: toSocials(v as unknown as Record<string, unknown>),
    standardTicketed: v.standardTicketed,
    standardTicketUrl: v.standardTicketUrl,
    standardTicketInformation: v.standardTicketInformation,
  };
}

interface ArtistDTO {
  id: string; name: string; genres?: string[]; artist_type?: string; artistType?: string;
  actType?: string[]; location?: string; profileImageUrl?: string | null; bio?: string;
  socialMediaUrls?: string[]; facebookUrl?: string; instagramUrl?: string; websiteUrl?: string; spotifyUrl?: string;
}
export function toArtist(a: ArtistDTO): Artist {
  return {
    id: a.id, name: a.name, genres: a.genres, artistType: a.artistType || a.artist_type,
    actType: a.actType, location: a.location, profileImageUrl: a.profileImageUrl, bio: a.bio,
    socials: toSocials(a as unknown as Record<string, unknown>),
  };
}

/* ---------- geo-based event fetching (map viewport) ---------- */
export interface LightEvent {
  id: string;
  artistId?: string;
  venueId: string;
  date: string;
  startTime?: string;
  geoLat: number;
  geoLng: number;
  /** absent until the geo GSI carries it (see AGENT-WORKORDER TASK 7) — MapView falls back to a join */
  ticketed?: boolean;
  /** feature 7 — may be absent from the GSI projection; MapView joins the full gigs cache as fallback */
  cancelled?: boolean;
}

export interface BBox { west: number; south: number; east: number; north: number }

export async function fetchGigsInView(bbox: BBox, startDate: string, endDate: string): Promise<{ events: LightEvent[]; truncated: boolean }> {
  const bboxParam = `${bbox.west},${bbox.south},${bbox.east},${bbox.north}`;
  const path = `/api/events/public/geo?bbox=${bboxParam}&startDate=${startDate}&endDate=${endDate}`;
  const res = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[bndy-api] GET ${path} → ${res.status}`, body);
    throw new Error(`GET ${path} → ${res.status}: ${body}`);
  }
  const data = await res.json() as { events?: LightEvent[]; truncated?: boolean };
  return { events: data.events || [], truncated: !!data.truncated };
}

export async function fetchEventsBatch(ids: string[]): Promise<Gig[]> {
  if (ids.length === 0) return [];
  const res = await fetch(`${BASE}/api/events/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventIds: ids.slice(0, 100) }),
  });
  if (!res.ok) throw new Error(`POST /api/events/batch → ${res.status}`);
  const data = await res.json() as { events?: GigDTO[] };
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}

/* ---------- endpoints ---------- */
export async function fetchGigs(params?: { startDate?: string; endDate?: string }): Promise<Gig[]> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  const data = await get<{ events?: GigDTO[] }>(`/api/events/public${q.toString() ? `?${q}` : ""}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}
export async function fetchVenues(): Promise<Venue[]> {
  const data = await get<VenueDTO[]>("/api/venues", 600);
  return data.map(toVenue).filter((v): v is Venue => v !== null);
}
export async function fetchArtists(): Promise<Artist[]> {
  const data = await get<ArtistDTO[]>("/api/artists", 600);
  return data.map(toArtist);
}
export async function fetchVenue(id: string): Promise<Venue | null> {
  return toVenue(await get<VenueDTO>(`/api/venues/${id}`));
}
export async function fetchArtist(id: string): Promise<Artist> {
  return toArtist(await get<ArtistDTO>(`/api/artists/${id}`));
}
/** Pre-launch cleanup: hard-deletes the artist AND cascades all its events + memberships (backend MCP route, no auth). Remove before public launch. */
export async function deleteArtist(id: string): Promise<{ cascadedEvents: number; cascadedMemberships: number }> {
  const res = await fetch(`${BASE}/api/artists/${id}/mcp`, { method: "DELETE" });
  if (!res.ok) throw new Error(`DELETE artist ${id} → ${res.status}`);
  const body = await res.json();
  return { cascadedEvents: body.cascadedEvents ?? 0, cascadedMemberships: body.cascadedMemberships ?? 0 };
}

export async function fetchArtistGigs(id: string, startDate: string): Promise<Gig[]> {
  const data = await get<{ events?: GigDTO[] }>(`/api/artists/${id}/public-events?startDate=${startDate}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}

export async function fetchArtistAvailability(id: string, startDate: string, endDate?: string): Promise<AvailabilityDate[]> {
  const params = new URLSearchParams({ startDate });
  if (endDate) params.append('endDate', endDate);
  const data = await get<{ availability?: AvailabilityDate[] }>(`/api/artists/${id}/public-availability?${params}`);
  return data.availability || [];
}

export async function fetchVenueGigs(id: string, startDate: string): Promise<Gig[]> {
  const data = await get<{ events?: GigDTO[] }>(`/api/venues/${id}/events?startDate=${startDate}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}
