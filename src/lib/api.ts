// bndy API client + DTO→domain transforms. All I/O lives here.

import type { Artist, Gig, SocialLink, SocialPlatform, Venue } from "@/domain/types";

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

interface GigDTO {
  id: string; title?: string; name?: string; date: string; startTime?: string; endTime?: string;
  venueId: string; venueName?: string; venueCity?: string; venue?: { city?: string };
  artistId?: string; artistName?: string; geoLat?: number; geoLng?: number;
  ticketed?: boolean; ticketUrl?: string; isOpenMic?: boolean;
}
export function toGig(e: GigDTO): Gig | null {
  if (typeof e.geoLat !== "number" || typeof e.geoLng !== "number") return null;
  return {
    id: e.id,
    title: e.title || e.name || e.artistName || "Live music",
    artistId: e.artistId,
    artistName: e.artistName,
    venueId: e.venueId,
    venueName: e.venueName || "",
    venueCity: e.venueCity || e.venue?.city,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    location: { lat: e.geoLat, lng: e.geoLng },
    ticketed: !!e.ticketed,
    ticketUrl: e.ticketUrl,
    isOpenMic: e.isOpenMic,
  };
}

interface VenueDTO {
  id: string; name: string; address?: string; city?: string | null; postcode?: string;
  location_object?: { lat: number; lng: number }; latitude?: number; longitude?: number;
  website?: string; profileImageUrl?: string | null;
}
export function toVenue(v: VenueDTO): Venue | null {
  const loc = v.location_object ?? (typeof v.latitude === "number" && typeof v.longitude === "number" ? { lat: v.latitude, lng: v.longitude } : null);
  if (!loc) return null;
  return {
    id: v.id, name: v.name, address: v.address, city: v.city ?? undefined, postcode: v.postcode,
    location: loc, website: v.website, profileImageUrl: v.profileImageUrl,
    socials: toSocials(v as unknown as Record<string, unknown>),
  };
}

interface ArtistDTO {
  id: string; name: string; genres?: string[]; artist_type?: string; artistType?: string;
  actType?: string[]; location?: string; profileImageUrl?: string | null; bio?: string;
}
export function toArtist(a: ArtistDTO): Artist {
  return {
    id: a.id, name: a.name, genres: a.genres, artistType: a.artistType || a.artist_type,
    actType: a.actType, location: a.location, profileImageUrl: a.profileImageUrl, bio: a.bio,
    socials: toSocials(a as unknown as Record<string, unknown>),
  };
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
export async function fetchArtistGigs(id: string, startDate: string): Promise<Gig[]> {
  const data = await get<{ events?: GigDTO[] }>(`/api/artists/${id}/public-events?startDate=${startDate}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}
export async function fetchVenueGigs(id: string, startDate: string): Promise<Gig[]> {
  const data = await get<{ events?: GigDTO[] }>(`/api/venues/${id}/events?startDate=${startDate}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}
