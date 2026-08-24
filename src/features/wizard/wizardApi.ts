// Gig wizard API client — spec: Projects/bndy/GIG-WIZARD-SPEC.md §5/§6.
// Kept separate from lib/api.ts (read paths) — these are the public community paths.
// Response parsing is deliberately tolerant: field names are pinned down in the spec,
// and the backend remains authoritative for identity/deduplication.

import { checkAuth } from "@/lib/auth/authApi";

const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

async function call<T>(method: "GET" | "POST", path: string, body?: unknown): Promise<{ status: number; body: T }> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  let parsed: T;
  try { parsed = (await res.json()) as T; } catch { parsed = {} as T; }
  return { status: res.status, body: parsed };
}

async function recordCuratorCreation(entityType: "artist" | "venue" | "event", entityId: string | undefined): Promise<void> {
  if (!entityId) return;
  try {
    const auth = await checkAuth();
    if (auth?.user.role !== "curator") return;
    const res = await fetch(`${BASE}/users/profile`, {
      method: "PUT", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curatorCreated: { entityType, entityId } }),
    });
    if (!res.ok) console.warn(`[curator] Could not record creator for ${entityType} ${entityId}: ${res.status}`);
  } catch (error) { console.warn(`[curator] Creator provenance failed for ${entityType} ${entityId}`, error); }
}

export interface FacebookSourceExisting { entityType: "artist" | "venue"; id: string; name: string }
export interface FacebookObserved { name?: string | null; imageUrl?: string | null; description?: string | null; canonicalUrl?: string | null; location?: string | null; address?: string | null; websiteUrl?: string | null }
export interface FacebookSourceInspection { ok: boolean; sourceUrl?: string; facebookUrl?: string | null; facebookKey?: string | null; identityResolved?: boolean; existing?: FacebookSourceExisting | null; observed?: FacebookObserved; evidence?: Record<string, string>; warnings?: string[]; error?: string; code?: string }
export async function inspectFacebookSource(input: string, expectedType: "artist" | "venue"): Promise<FacebookSourceInspection> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/source/inspect", { input, expectedType });
  if (status === 200) return { ok: true, sourceUrl: body.sourceUrl as string | undefined, facebookUrl: (body.facebookUrl as string | null | undefined) ?? null, facebookKey: (body.facebookKey as string | null | undefined) ?? null, identityResolved: (body.identityResolved as boolean | undefined) ?? !!body.facebookKey, existing: (body.existing as FacebookSourceExisting | null | undefined) ?? null, observed: (body.observed as FacebookObserved | undefined) ?? {}, evidence: (body.evidence as Record<string, string> | undefined) ?? {}, warnings: (body.warnings as string[] | undefined) ?? [] };
  return { ok: false, error: (body.error as string) ?? "Could not inspect that Facebook page", code: body.code as string | undefined };
}

export interface PlaceSuggestion { placeId: string; name: string; address: string }
export async function placesSuggest(q: string, kind: "venue" | "town" = "venue"): Promise<PlaceSuggestion[]> {
  const { status, body } = await call<{ suggestions?: PlaceSuggestion[] }>("GET", `/api/places/suggest?q=${encodeURIComponent(q)}${kind === "town" ? "&kind=town" : ""}`);
  if (status !== 200) return [];
  return body.suggestions ?? [];
}
export interface PlaceDetails { placeId: string; name: string; address: string; city?: string; lat: number; lng: number; typeWarning?: string }
export async function placesDetails(placeId: string): Promise<PlaceDetails | null> {
  const { status, body } = await call<{ place?: PlaceDetails }>("GET", `/api/places/details?placeId=${encodeURIComponent(placeId)}`);
  if (status !== 200) return null;
  return body.place ?? (body as unknown as PlaceDetails) ?? null;
}

export interface VenueResult { ok: boolean; venueId?: string; venueName?: string; city?: string; needsReview?: boolean; error?: string }
export async function findOrCreateVenue(input: { name: string; address?: string; city?: string; googlePlaceId?: string; latitude?: number; longitude?: number; socialMediaUrls?: string[] }): Promise<VenueResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/venues/find-or-create", { ...input, source: "community_wizard" });
  const v = (body.venue ?? body) as Record<string, unknown>;
  const id = (v.id ?? body.venueId ?? body.existingId) as string | undefined;
  if ((status === 200 || status === 201) && id) { if (status === 201) await recordCuratorCreation("venue", id); return { ok: true, venueId: id, venueName: (v.name as string) ?? input.name, city: (v.city as string) ?? input.city }; }
  if (status === 422) return { ok: false, needsReview: true, error: (body.error as string) ?? "Venue could not be verified" };
  if (status === 409) { const existing = (body.existingId ?? body.existingVenueId) as string | undefined; if (existing) return { ok: true, venueId: existing, venueName: input.name, city: input.city }; }
  return { ok: false, error: (body.error as string) ?? `Venue lookup failed (${status})` };
}

export interface ArtistCandidate { id: string; name: string; location?: string; nameVariants?: string[]; matchedVariant?: string; matchedBy?: string; profileImageUrl?: string }
export interface ArtistResolution { action: "matched" | "review" | "clear" | "created" | "create_failed" | "error"; artistId?: string; artistName?: string; artistLocation?: string; candidates: ArtistCandidate[]; matchedBy?: string; matchedVariant?: string; code?: string; message?: string }
export async function resolveArtist(input: { name: string; location: string; facebookUrl?: string; profileImageUrl?: string; verifiedSourceName?: boolean; bio?: string; websiteUrl?: string; genres?: string[]; artistType?: string; actType?: string[]; acoustic?: boolean }, opts?: { dryRun?: boolean; confirmNew?: boolean; resolveTo?: string }): Promise<ArtistResolution> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/artists/find-or-create", { ...input, source: "community_wizard", ...(opts?.dryRun ? { dryRun: true } : {}), ...(opts?.confirmNew ? { confirmNew: true } : {}), ...(opts?.resolveTo ? { resolveTo: opts.resolveTo } : {}) });
  const artist = (body.artist ?? {}) as Record<string, unknown>;
  const artistId = (body.artistId ?? artist.id ?? body.existingArtistId ?? body.existingId) as string | undefined;
  const rawCandidates = (body.candidates ?? body.matches ?? []) as Array<Record<string, unknown>>;
  const candidates: ArtistCandidate[] = rawCandidates.map((c) => ({ id: (c.id ?? c.artistId) as string, name: (c.name as string) ?? "", location: c.location as string | undefined, nameVariants: (c.nameVariants ?? c.name_variants) as string[] | undefined, matchedVariant: c.matchedVariant as string | undefined, matchedBy: c.matchedBy as string | undefined, profileImageUrl: c.profileImageUrl as string | undefined })).filter((c) => c.id && c.name);
  const action = (body.action as ArtistResolution["action"]) ?? undefined;
  const matchedBy = body.matchedBy as string | undefined;
  const matchedVariant = (body.variant ?? body.matchedVariant) as string | undefined;

  if (status === 409) return { action: "matched", artistId, artistName: input.name, artistLocation: input.location, candidates, matchedBy: "unique_gate" };
  if (action) {
    if (action === "created" && artistId) await recordCuratorCreation("artist", artistId);
    return { action, artistId, artistName: (artist.name as string) ?? input.name, artistLocation: (artist.location as string) ?? input.location, candidates, matchedBy, matchedVariant, code: body.code as string, message: (body.message ?? body.error) as string };
  }
  if ((status === 200 || status === 201) && artistId) { if (status === 201) await recordCuratorCreation("artist", artistId); return { action: "matched", artistId, artistName: input.name, artistLocation: input.location, candidates }; }
  return { action: "error", candidates, code: body.code as string, message: ((body.message ?? body.error) as string | undefined) ?? `Artist lookup failed (${status})` };
}

export interface EventResult { ok: boolean; eventId?: string; existingEventId?: string; error?: string }
export async function createCommunityEvent(payload: { artistId?: string; artistIds?: string[]; headlineArtistIds?: string[]; isOpenMic?: boolean; venueId: string; date: string; startTime: string; endTime?: string; title?: string; ticketed?: boolean; ticketUrl?: string; ticketInformation?: string; imageUrl?: string; description?: string; festivalId?: string; festivalName?: string; hp?: string; startedAt?: number }): Promise<EventResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/events", { ...payload, source: "community_wizard" });
  const eventId = (body.eventId ?? (body.event as Record<string, unknown> | undefined)?.id ?? body.id) as string | undefined;
  if ((status === 200 || status === 201) && eventId) { if (status === 201) await recordCuratorCreation("event", eventId); return { ok: true, eventId }; }
  if (status === 409) return { ok: true, existingEventId: (body.existingEventId ?? body.eventId) as string | undefined };
  return { ok: false, error: (body.error as string) ?? `Event creation failed (${status})` };
}
