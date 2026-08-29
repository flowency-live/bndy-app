import type { Artist, AvailabilityDate } from "@/domain/types";
import { toArtist, type ArtistDTO } from "@/lib/api";

const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`) as Error & { code?: string };
    error.code = body.code;
    throw error;
  }
  return body as T;
}

export type OwnedArtistProfileUpdate = Partial<Pick<Artist,
  "bio" | "location" | "genres" | "artistType" | "actType" | "acoustic" |
  "publishAvailability" | "availabilityMode" | "contactMethod" | "phoneNumber" | "whatsappNumber" | "availabilityMessage"
>> & {
  locationType?: "city" | "town" | "region" | null;
  locationLat?: number | null;
  locationLng?: number | null;
  facebookUrl?: string | null;
  instagramUrl?: string | null;
  websiteUrl?: string | null;
  youtubeUrl?: string | null;
  spotifyUrl?: string | null;
  soundcloudUrl?: string | null;
  bandcampUrl?: string | null;
};

export interface ManagedAvailability {
  availability: AvailabilityDate[];
  busyDates: string[];
}

export interface ArtistManagementRelationship {
  artistId: string;
  role: string;
  status: string;
}

export async function getMyArtistManagementRelationships(): Promise<ArtistManagementRelationship[]> {
  const body = await request<{ artists?: Array<Record<string, unknown>> }>("/api/memberships/me");
  return (body.artists ?? []).map((membership) => {
    const artist = (membership.artist ?? {}) as Record<string, unknown>;
    return {
      artistId: String(artist.id || membership.artist_id || ""),
      role: String(membership.role || "member"),
      status: String(membership.status || "active"),
    };
  }).filter((relationship) => relationship.artistId);
}

export async function updateOwnedArtistProfile(artistId: string, fields: OwnedArtistProfileUpdate): Promise<Artist> {
  const profile = await request<ArtistDTO>(`/api/artists/${artistId}/profile`, {
    method: "PATCH",
    body: JSON.stringify(fields),
  });
  return toArtist(profile);
}

export async function getOwnedArtistProfile(artistId: string): Promise<Artist> {
  const profile = await request<ArtistDTO>(`/api/artists/${artistId}/profile`);
  return toArtist(profile);
}

export function getManagedArtistAvailability(artistId: string, startDate: string, endDate: string): Promise<ManagedAvailability> {
  const params = new URLSearchParams({ startDate, endDate });
  return request<ManagedAvailability>(`/api/artists/${artistId}/availability?${params}`);
}

export async function getPublicArtistAvailability(artistId: string, startDate: string, endDate: string): Promise<AvailabilityDate[]> {
  const params = new URLSearchParams({ startDate, endDate });
  const body = await request<{ availability?: AvailabilityDate[] }>(`/api/artists/${artistId}/public-availability?${params}`);
  return body.availability ?? [];
}

export function toggleArtistAvailability(artistId: string, date: string): Promise<{
  action: "created" | "deleted";
  id?: string;
  event?: AvailabilityDate;
}> {
  return request(`/api/artists/${artistId}/events/toggle-availability`, {
    method: "POST",
    body: JSON.stringify({ date }),
  });
}
