export type BrassEditionScope = "live" | "brass";

export interface BrassBandName {
  name: string;
  nameType?: string;
  validFrom?: string;
  validTo?: string;
  sourceUrl?: string;
  confidence?: number;
}

export interface BrassBand {
  id: string;
  name: string;
  performerKind: "brass_band";
  publicationScopes: BrassEditionScope[];
  names: BrassBandName[];
  nameVariants: string[];
  location: string;
  locationLat: number | null;
  locationLng: number | null;
  profileImageUrl: string;
  bio: string;
  websiteUrl: string;
  domainProfiles?: Record<string, unknown> | null;
  claimStatus?: string;
  isVerified?: boolean;
}

export interface BrassConcert {
  id: string;
  title: string;
  eventKind: "concert";
  artistId?: string | null;
  artistName?: string | null;
  venueId: string;
  venueName: string;
  venueCity?: string;
  date: string;
  startTime?: string | null;
  endTime?: string | null;
  geoLat: number;
  geoLng: number;
  ticketed: boolean;
  ticketUrl?: string | null;
  cancelled: boolean;
  festivalId?: string | null;
  festivalName?: string | null;
  productionId?: string | null;
  productionName?: string | null;
  conductorName?: string | null;
  publicationScopes: BrassEditionScope[];
}

export interface BrassFestival {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  ticketed?: boolean;
  price?: string | null;
  ticketUrl?: string | null;
  websiteUrl?: string | null;
  publicationScopes: BrassEditionScope[];
}

export interface BrassProduction {
  id: string;
  performerId: string;
  name: string;
  slug: string;
  productionKind?: string;
  description?: string;
  imageUrl?: string | null;
  websiteUrl?: string | null;
  status?: string;
  publicationScopes: BrassEditionScope[];
  isDefault?: boolean;
}

const BASE = (process.env.NEXT_PUBLIC_BRASS_API_URL || "").replace(/\/$/, "");

async function get<T>(path: string): Promise<T> {
  if (!BASE) throw new Error("NEXT_PUBLIC_BRASS_API_URL is required for the brass edition");
  const response = await fetch(`${BASE}${path}`, { next: { revalidate: 60 } });
  if (!response.ok) throw new Error(`Brass API GET ${path} returned ${response.status}`);
  return response.json() as Promise<T>;
}

export function fetchBrassBands(): Promise<BrassBand[]> { return get("/bands"); }
export function fetchBrassConcerts(): Promise<BrassConcert[]> { return get("/concerts"); }
export function fetchBrassFestivals(): Promise<BrassFestival[]> { return get("/festivals"); }
export function fetchBrassProductions(bandId?: string): Promise<BrassProduction[]> {
  return get(`/productions${bandId ? `?bandId=${encodeURIComponent(bandId)}` : ""}`);
}
