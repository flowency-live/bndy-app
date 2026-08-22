import type { Artist, FestivalSummary, Gig, PerformerName, Production, ResolvedTicketing } from "@/domain/types";

const BASE = (process.env.NEXT_PUBLIC_BRASS_API_URL || "").replace(/\/$/, "");

async function get<T>(path: string): Promise<T> {
  if (!BASE) throw new Error("NEXT_PUBLIC_BRASS_API_URL is required for the brass edition");
  const response = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`GET ${path} → ${response.status}`);
  return response.json() as Promise<T>;
}

type Raw = Record<string, unknown>;

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const result = value.filter((item): item is string => typeof item === "string");
  return result.length ? result : undefined;
}

function publicationScopes(raw: Raw): Array<"live" | "brass"> | undefined {
  const values = stringArray(raw.publicationScopes);
  if (!values) return undefined;
  const scopes = values.filter((value): value is "live" | "brass" => value === "live" || value === "brass");
  return scopes.length ? scopes : undefined;
}

function toBrassBand(raw: Raw): Artist | null {
  if (typeof raw.id !== "string" || typeof raw.name !== "string") return null;
  const kind = raw.performerKind === "brass_band" ? "brass_band" : undefined;
  if (kind !== "brass_band") return null;

  const names = Array.isArray(raw.names)
    ? raw.names.filter((item): item is PerformerName => !!item && typeof item === "object" && typeof (item as Raw).name === "string")
    : undefined;

  return {
    id: raw.id,
    name: raw.name,
    performerKind: kind,
    publicationScopes: publicationScopes(raw),
    names,
    artistType: typeof raw.artistType === "string" ? raw.artistType : typeof raw.artist_type === "string" ? raw.artist_type : "band",
    location: typeof raw.location === "string" ? raw.location : undefined,
    profileImageUrl: typeof raw.profileImageUrl === "string" ? raw.profileImageUrl : null,
    bio: typeof raw.bio === "string" ? raw.bio : undefined,
    domainProfiles: raw.domainProfiles && typeof raw.domainProfiles === "object" ? raw.domainProfiles as Artist["domainProfiles"] : undefined,
  };
}

function toBrassConcert(raw: Raw): Gig | null {
  const lat = typeof raw.geoLat === "number" ? raw.geoLat : undefined;
  const lng = typeof raw.geoLng === "number" ? raw.geoLng : undefined;
  if (typeof raw.id !== "string" || typeof raw.date !== "string" || typeof raw.venueId !== "string" || lat === undefined || lng === undefined) return null;

  const ticketingRaw = raw.ticketing && typeof raw.ticketing === "object" ? raw.ticketing as Raw : null;
  const ticketing: ResolvedTicketing | undefined = ticketingRaw ? {
    isTicketed: ticketingRaw.isTicketed === true,
    source: ticketingRaw.source === "event" || ticketingRaw.source === "venue" ? ticketingRaw.source : "none",
    price: typeof ticketingRaw.price === "string" ? ticketingRaw.price : undefined,
    ticketUrl: typeof ticketingRaw.ticketUrl === "string" ? ticketingRaw.ticketUrl : undefined,
    ticketInformation: typeof ticketingRaw.ticketInformation === "string" ? ticketingRaw.ticketInformation : undefined,
  } : undefined;

  return {
    id: raw.id,
    title: typeof raw.title === "string" ? raw.title : typeof raw.artistName === "string" ? raw.artistName : "Concert",
    artistId: typeof raw.artistId === "string" ? raw.artistId : undefined,
    artistName: typeof raw.artistName === "string" ? raw.artistName : undefined,
    venueId: raw.venueId,
    venueName: typeof raw.venueName === "string" ? raw.venueName : "",
    venueCity: typeof raw.venueCity === "string" ? raw.venueCity : undefined,
    date: raw.date,
    startTime: typeof raw.startTime === "string" ? raw.startTime : undefined,
    endTime: typeof raw.endTime === "string" ? raw.endTime : undefined,
    location: { lat, lng },
    ticketed: ticketing?.isTicketed ?? raw.ticketed === true,
    ticketUrl: ticketing?.ticketUrl ?? (typeof raw.ticketUrl === "string" ? raw.ticketUrl : undefined),
    ticketing,
    cancelled: raw.cancelled === true,
    festivalId: typeof raw.festivalId === "string" ? raw.festivalId : undefined,
    festivalName: typeof raw.festivalName === "string" ? raw.festivalName : undefined,
    productionId: typeof raw.productionId === "string" ? raw.productionId : undefined,
    productionName: typeof raw.productionName === "string" ? raw.productionName : undefined,
    conductorName: typeof raw.conductorName === "string" ? raw.conductorName : undefined,
    publicationScopes: publicationScopes(raw),
  };
}

export async function fetchBrassBands(): Promise<Artist[]> {
  const rows = await get<Raw[]>("/bands");
  return rows.map(toBrassBand).filter((band): band is Artist => !!band);
}

export async function fetchBrassConcerts(): Promise<Gig[]> {
  const rows = await get<Raw[]>("/concerts");
  return rows.map(toBrassConcert).filter((concert): concert is Gig => !!concert);
}

export async function fetchBrassFestivals(): Promise<FestivalSummary[]> {
  return get<FestivalSummary[]>("/festivals");
}

export async function fetchBrassProductions(bandId?: string): Promise<Production[]> {
  const suffix = bandId ? `?bandId=${encodeURIComponent(bandId)}` : "";
  return get<Production[]>(`/productions${suffix}`);
}
