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

/**
 * The community create endpoints intentionally remain public. When the caller
 * happens to be a logged-in curator, add creator provenance after a confirmed
 * NEW record is created so an "own records only" policy has a trustworthy key.
 *
 * This is best-effort: a provenance failure must never turn a successful
 * public create into an apparent failure or encourage a duplicate retry.
 */
async function recordCuratorCreation(entityType: "artist" | "venue" | "event", entityId: string | undefined): Promise<void> {
  if (!entityId) return;
  try {
    const auth = await checkAuth();
    if (auth?.user.role !== "curator") return;
    const res = await fetch(`${BASE}/users/profile`, {
      method: "PUT",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ curatorCreated: { entityType, entityId } }),
    });
    if (!res.ok) console.warn(`[curator] Could not record creator for ${entityType} ${entityId}: ${res.status}`);
  } catch (error) {
    console.warn(`[curator] Creator provenance failed for ${entityType} ${entityId}`, error);
  }
}

/* ---------------- Facebook source inspection (read-only) ---------------- */
export interface FacebookSourceExisting {
  entityType: "artist" | "venue";
  id: string;
  name: string;
}
export interface FacebookObserved {
  name?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  canonicalUrl?: string | null;
  location?: string | null;
  address?: string | null;
  websiteUrl?: string | null;
  artistType?: string | null;
  actTypes?: string[];
  genres?: string[];
  acoustic?: boolean;
}
export interface FacebookSourceInspection {
  ok: boolean;
  sourceUrl?: string;
  facebookUrl?: string | null;
  facebookKey?: string | null;
  identityResolved?: boolean;
  existing?: FacebookSourceExisting | null;
  observed?: FacebookObserved;
  evidence?: Record<string, string>;
  warnings?: string[];
  error?: string;
  code?: string;
}
export async function inspectFacebookSource(input: string, expectedType: "artist" | "venue"): Promise<FacebookSourceInspection> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/source/inspect", { input, expectedType });
  if (status === 200) {
    return {
      ok: true,
      sourceUrl: body.sourceUrl as string | undefined,
      facebookUrl: (body.facebookUrl as string | null | undefined) ?? null,
      facebookKey: (body.facebookKey as string | null | undefined) ?? null,
      identityResolved: (body.identityResolved as boolean | undefined) ?? !!body.facebookKey,
      existing: (body.existing as FacebookSourceExisting | null | undefined) ?? null,
      observed: (body.observed as FacebookObserved | undefined) ?? {},
      evidence: (body.evidence as Record<string, string> | undefined) ?? {},
      warnings: (body.warnings as string[] | undefined) ?? [],
    };
  }
  return {
    ok: false,
    error: (body.error as string) ?? "Could not inspect that Facebook page",
    code: body.code as string | undefined,
  };
}

/* ---------------- Google Places (via backend proxy) ---------------- */
export interface PlaceSuggestion { placeId: string; name: string; address: string }
export async function placesSuggest(q: string, kind: "venue" | "town" = "venue"): Promise<PlaceSuggestion[]> {
  const { status, body } = await call<{ suggestions?: PlaceSuggestion[] }>("GET", `/api/places/suggest?q=${encodeURIComponent(q)}${kind === "town" ? "&kind=town" : ""}`);
  if (status !== 200) return [];
  return body.suggestions ?? [];
}
export interface PlaceDetails {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  lat: number;
  lng: number;
  /** set by the proxy when Google's types look unlike a gig venue (e.g. "school") — confirm card shows a caution */
  typeWarning?: string;
}
export async function placesDetails(placeId: string): Promise<PlaceDetails | null> {
  const { status, body } = await call<{ place?: PlaceDetails }>("GET", `/api/places/details?placeId=${encodeURIComponent(placeId)}`);
  if (status !== 200) return null;
  return body.place ?? (body as unknown as PlaceDetails) ?? null;
}

/* ---------------- venue find-or-create ---------------- */
export interface VenueResult {
  ok: boolean;
  venueId?: string;
  venueName?: string;
  city?: string;
  needsReview?: boolean;
  error?: string;
}
export async function findOrCreateVenue(input: { name: string; address?: string; city?: string; googlePlaceId?: string; latitude?: number; longitude?: number; socialMediaUrls?: string[] }): Promise<VenueResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/venues/find-or-create", { ...input, source: "community_wizard" });
  const v = (body.venue ?? body) as Record<string, unknown>;
  const id = (v.id ?? body.venueId ?? body.existingId) as string | undefined;
  if ((status === 200 || status === 201) && id) {
    if (status === 201) await recordCuratorCreation("venue", id);
    return { ok: true, venueId: id, venueName: (v.name as string) ?? input.name, city: (v.city as string) ?? input.city };
  }
  if (status === 422) return { ok: false, needsReview: true, error: (body.error as string) ?? "Venue could not be verified" };
  if (status === 409) {
    const existing = (body.existingId ?? body.existingVenueId) as string | undefined;
    if (existing) return { ok: true, venueId: existing, venueName: input.name, city: input.city };
  }
  return { ok: false, error: (body.error as string) ?? `Venue lookup failed (${status})` };
}

/* ---------------- artist find-or-create ---------------- */
export interface ArtistCandidate { id: string; name: string; location?: string }
export interface ArtistResolution {
  action: "matched" | "review" | "created" | "create_failed" | "error";
  artistId?: string;
  artistName?: string;
  candidates: ArtistCandidate[];
  code?: string;
  message?: string;
}
export async function resolveArtist(
  input: {
    name: string;
    location: string;
    facebookUrl?: string;
    profileImageUrl?: string;
    verifiedSourceName?: boolean;
    bio?: string;
    websiteUrl?: string;
    genres?: string[];
    artistType?: string;
    actType?: string[];
    acoustic?: boolean;
  },
  opts?: { dryRun?: boolean; confirmNew?: boolean; resolveTo?: string },
): Promise<ArtistResolution> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/artists/find-or-create", {
    ...input,
    source: "community_wizard",
    ...(opts?.dryRun ? { dryRun: true } : {}),
    ...(opts?.confirmNew ? { confirmNew: true } : {}),
    ...(opts?.resolveTo ? { resolveTo: opts.resolveTo } : {}),
  });
  const artist = (body.artist ?? {}) as Record<string, unknown>;
  const artistId = (body.artistId ?? artist.id ?? body.existingArtistId ?? body.existingId) as string | undefined;
  const rawCandidates = (body.candidates ?? body.matches ?? []) as Array<Record<string, unknown>>;
  const candidates: ArtistCandidate[] = rawCandidates.map((c) => ({
    id: (c.id ?? c.artistId) as string,
    name: (c.name as string) ?? "",
    location: c.location as string | undefined,
  })).filter((c) => c.id && c.name);
  const action = (body.action as ArtistResolution["action"]) ?? undefined;

  if (status === 409) {
    // gate bounce: same name + same region = it already exists. That's a MATCH, not an error.
    return { action: "matched", artistId, artistName: input.name, candidates };
  }
  if (action) {
    if (action === "created" && artistId) await recordCuratorCreation("artist", artistId);
    return { action, artistId, artistName: (artist.name as string) ?? input.name, candidates, code: body.code as string, message: (body.message ?? body.error) as string };
  }
  if ((status === 200 || status === 201) && artistId) {
    if (status === 201) await recordCuratorCreation("artist", artistId);
    return { action: "matched", artistId, artistName: input.name, candidates };
  }
  return { action: "error", candidates, code: body.code as string, message: ((body.message ?? body.error) as string | undefined) ?? `Artist lookup failed (${status})` };
}

/* ---------------- community event create ---------------- */
export interface EventResult {
  ok: boolean;
  eventId?: string;
  /** 409 — the gig already exists; UI treats this as a happy path */
  existingEventId?: string;
  error?: string;
}
export async function createCommunityEvent(payload: {
  /** optional for open mics (artist-less events; the backend requires isOpenMic instead) */
  artistId?: string;
  /** feature 12 — the whole bill in display order, act 1 first. Sent ONLY when
   *  there is more than one act, so a single-act publish is unchanged. */
  artistIds?: string[];
  /** feature 12 — which acts are billed as headline. Absent means [artistIds[0]]. */
  headlineArtistIds?: string[];
  isOpenMic?: boolean;
  venueId: string;
  date: string;
  startTime: string;
  endTime?: string;
  title?: string;
  ticketed?: boolean;
  ticketUrl?: string;
  ticketInformation?: string;
  imageUrl?: string;
  description?: string;
  /** festival curator builder: a gig created from a festival's manage page is
   *  born linked. The community endpoint already stores these (MCP parity). */
  festivalId?: string;
  festivalName?: string;
  /** bot traps (Addendum E): hp must arrive EMPTY (honeypot); startedAt = wizard mount epoch ms — server rejects submits <3s after open */
  hp?: string;
  startedAt?: number;
}): Promise<EventResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/community/events", { ...payload, source: "community_wizard" });
  const eventId = (body.eventId ?? (body.event as Record<string, unknown> | undefined)?.id ?? body.id) as string | undefined;
  if (status === 200 || status === 201) {
    if (status === 201) await recordCuratorCreation("event", eventId);
    return { ok: true, eventId };
  }
  if (status === 409) return { ok: false, existingEventId: (body.existingEventId ?? body.existingId) as string | undefined, error: "duplicate" };
  return { ok: false, error: ((body.error ?? body.message) as string | undefined) ?? `Publish failed (${status})` };
}
