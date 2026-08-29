// bndy API client + DTO→domain transforms. All I/O lives here.

import type {
  Artist,
  ArtistAvailabilityCalendar,
  Festival,
  FestivalBilling,
  FestivalLineupSlot,
  FestivalStage,
  FestivalSummary,
  Gig,
  ResolvedTicketing,
  SocialLink,
  SocialPlatform,
  Venue,
} from "@/domain/types";
import { canonicalActTypes, canonicalArtistType } from "@/lib/artistTaxonomyCore";

// Same-origin detection: when on bndy.live, CloudFront routes /api/* to API Gateway
const BASE = typeof window !== 'undefined' && window.location.hostname.endsWith('bndy.live')
  ? ''  // Same-origin, no CORS preflight needed
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

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
  if (u.includes("youtube") || u.includes("youtu.be")) return "youtube";
  if (u.includes("soundcloud")) return "soundcloud";
  if (u.includes("bandcamp")) return "bandcamp";
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
  // Dedicated profile fields are curator or artist-managed and therefore take
  // precedence over older links left in the generic social array.
  ["facebookUrl", "instagramUrl", "websiteUrl", "youtubeUrl", "spotifyUrl", "soundcloudUrl", "bandcampUrl", "twitterUrl", "website"].forEach((k) => push(dto[k]));
  const arr = (dto.socialMediaUrls ?? dto.socialMediaURLs) as unknown[] | undefined;
  if (Array.isArray(arr)) arr.forEach((x) => push(typeof x === "string" ? x : (x as { url?: string })?.url));
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
  type?: string;
  artistIds?: string[]; artistNames?: string[]; headlineArtistIds?: string[];
  festivalId?: string; festivalName?: string; festivalSlug?: string;
  stageId?: string; billing?: FestivalBilling; billingOrder?: number;
}
export function toGig(e: GigDTO): Gig | null {
  if (typeof e.geoLat !== "number" || typeof e.geoLng !== "number") return null;
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
    festivalId: e.festivalId,
    festivalName: e.festivalName,
    festivalSlug: e.festivalSlug,
    stageId: e.stageId,
    billing: e.billing,
    billingOrder: e.billingOrder,
    artistIds: e.artistIds?.length ? e.artistIds : undefined,
    artistNames: e.artistNames?.length ? e.artistNames : undefined,
    headlineArtistIds: e.headlineArtistIds?.length ? e.headlineArtistIds : undefined,
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

export interface ArtistDTO {
  id: string; name: string; genres?: string[]; artist_type?: string; artistType?: string;
  actType?: string[]; acoustic?: boolean; location?: string; profileImageUrl?: string | null; bio?: string;
  socialMediaUrls?: string[]; facebookUrl?: string; instagramUrl?: string; websiteUrl?: string;
  youtubeUrl?: string; spotifyUrl?: string; soundcloudUrl?: string; bandcampUrl?: string;
  publishAvailability?: boolean; availabilityMode?: 'selected_dates_only' | 'free_weekends';
  contactMethod?: 'phone' | 'whatsapp'; phoneNumber?: string | null; whatsappNumber?: string | null;
  availabilityMessage?: string | null;
}
export function toArtist(a: ArtistDTO): Artist {
  const legacyActs = canonicalActTypes(a.actType);
  return {
    id: a.id,
    name: a.name,
    genres: a.genres,
    artistType: canonicalArtistType(a.artistType || a.artist_type) ?? a.artistType ?? a.artist_type,
    actType: legacyActs.actTypes,
    acoustic: a.acoustic === true || legacyActs.acousticFromLegacy,
    location: a.location,
    profileImageUrl: a.profileImageUrl,
    bio: a.bio,
    socials: toSocials(a as unknown as Record<string, unknown>),
    publishAvailability: a.publishAvailability,
    availabilityMode: a.availabilityMode,
    contactMethod: a.contactMethod,
    phoneNumber: a.phoneNumber,
    whatsappNumber: a.whatsappNumber,
    availabilityMessage: a.availabilityMessage,
  };
}

interface FestivalDTO {
  id: string;
  slug: string;
  name: string;
  description?: string;
  startDate: string;
  endDate?: string;
  town?: string;
  location?: string;
  primaryVenueId?: string;
  venueIds?: string[];
  stages?: FestivalStage[];
  lineup?: FestivalLineupSlot[];
  ticketed?: boolean;
  price?: string;
  ticketUrl?: string;
  lineupUrl?: string;
  websiteUrl?: string;
  socialMediaUrls?: string[];
  heroImageUrl?: string;
  posterImageUrl?: string;
  theme?: unknown;
  actCount?: number;
  gigCount?: number;
  venueCount?: number;
}

export function toFestivalSummary(f: FestivalDTO): FestivalSummary {
  const venueIds = [...new Set([f.primaryVenueId, ...(f.venueIds || [])].filter((id): id is string => !!id))];
  return {
    id: f.id,
    slug: f.slug,
    name: f.name,
    startDate: f.startDate,
    endDate: f.endDate || f.startDate,
    location: f.location || f.town,
    venueIds,
    posterImageUrl: f.posterImageUrl,
    heroImageUrl: f.heroImageUrl,
    actCount: f.actCount ?? f.lineup?.length,
    gigCount: f.gigCount,
    venueCount: f.venueCount ?? venueIds.length,
    price: f.price,
    ticketed: f.ticketed,
  };
}

export function toFestival(f: FestivalDTO): Festival {
  return {
    ...toFestivalSummary(f),
    description: f.description,
    primaryVenueId: f.primaryVenueId,
    stages: Array.isArray(f.stages) ? f.stages : [],
    lineup: Array.isArray(f.lineup) ? f.lineup : [],
    ticketUrl: f.ticketUrl,
    lineupUrl: f.lineupUrl,
    websiteUrl: f.websiteUrl,
    socialMediaUrls: Array.isArray(f.socialMediaUrls) ? f.socialMediaUrls : [],
    theme: f.theme,
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
  ticketed?: boolean;
  cancelled?: boolean;
  festivalId?: string;
  festivalName?: string;
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

/** Batch endpoint is capped at 100 IDs; transparently chunk larger festival programmes. */
export async function fetchEventsBatch(ids: string[]): Promise<Gig[]> {
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
    const data = await res.json() as { events?: GigDTO[] };
    return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
  }));
  const byId = new Map(results.flat().map((g) => [g.id, g]));
  return unique.map((id) => byId.get(id)).filter((g): g is Gig => !!g);
}

/* ---------- endpoints ---------- */
export async function fetchGigs(params?: { startDate?: string; endDate?: string }): Promise<Gig[]> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  const data = await get<{ events?: GigDTO[] }>(`/api/events/public${q.toString() ? `?${q}` : ""}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}

export async function fetchFestivals(params?: { startDate?: string; endDate?: string }): Promise<FestivalSummary[]> {
  const q = new URLSearchParams();
  if (params?.startDate) q.set("startDate", params.startDate);
  if (params?.endDate) q.set("endDate", params.endDate);
  const data = await get<{ festivals?: FestivalDTO[] }>(`/api/festivals/public${q.toString() ? `?${q}` : ""}`, 300);
  return (data.festivals || []).map(toFestivalSummary).sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export async function fetchFestival(slug: string): Promise<{ festival: Festival; childEvents: Gig[] }> {
  const data = await get<{ festival: FestivalDTO; childEvents?: GigDTO[] }>(`/api/festivals/slug/${encodeURIComponent(slug)}`, 60);
  const festival = toFestival(data.festival);
  const rawEvents = data.childEvents || [];
  // The festival endpoint intentionally returns raw event rows. Enrich through the
  // standard batch endpoint so schedule/map cards get the exact same artist, venue
  // and ticketing shape as the rest of bndy. This also avoids one request per gig.
  const childEvents = await fetchEventsBatch(rawEvents.map((e) => e.id));
  const withParent = childEvents.map((gig) => ({
    ...gig,
    festivalId: gig.festivalId || festival.id,
    festivalName: gig.festivalName || festival.name,
    festivalSlug: festival.slug,
  }));
  return { festival: { ...festival, gigCount: festival.gigCount ?? withParent.length }, childEvents: withParent };
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

export async function fetchArtistAvailability(id: string, startDate: string, endDate?: string): Promise<ArtistAvailabilityCalendar> {
  const params = new URLSearchParams({ startDate });
  if (endDate) params.append('endDate', endDate);
  const data = await get<Partial<ArtistAvailabilityCalendar>>(`/api/artists/${id}/public-availability?${params}`);
  return { availability: data.availability || [], dateStatuses: data.dateStatuses || [] };
}

export async function fetchVenueGigs(id: string, startDate: string): Promise<Gig[]> {
  const data = await get<{ events?: GigDTO[] }>(`/api/venues/${id}/events?startDate=${startDate}`);
  return (data.events || []).map(toGig).filter((g): g is Gig => g !== null);
}
