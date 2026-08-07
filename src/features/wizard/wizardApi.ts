// Gig wizard API client — spec: Projects/bndy/GIG-WIZARD-SPEC.md §5/§6.
// Kept separate from lib/api.ts (read paths) — these are the public community WRITE paths.
// Response parsing is deliberately tolerant: field names are pinned down in the spec,
// and the VSCode agent verifies exact shapes against the lambdas before deploy.

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

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

/* ---------------- Google Places (via NEW backend proxy, workorder B1) ---------------- */
export interface PlaceSuggestion { placeId: string; name: string; address: string }
export async function placesSuggest(q: string): Promise<PlaceSuggestion[]> {
  const { status, body } = await call<{ suggestions?: PlaceSuggestion[] }>("GET", `/api/places/suggest?q=${encodeURIComponent(q)}`);
  if (status !== 200) return [];
  return body.suggestions ?? [];
}
export interface PlaceDetails { placeId: string; name: string; address: string; city?: string; lat: number; lng: number }
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
export async function findOrCreateVenue(input: { name: string; address?: string; city?: string; googlePlaceId?: string; latitude?: number; longitude?: number }): Promise<VenueResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/venues/find-or-create", { ...input, source: "community_wizard" });
  const v = (body.venue ?? body) as Record<string, unknown>;
  const id = (v.id ?? body.venueId ?? body.existingId) as string | undefined;
  if ((status === 200 || status === 201) && id) {
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
  input: { name: string; location: string; facebookUrl?: string; genres?: string[] },
  opts?: { dryRun?: boolean; confirmNew?: boolean; resolveTo?: string },
): Promise<ArtistResolution> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/artists/find-or-create", {
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
  if (action) return { action, artistId, artistName: (artist.name as string) ?? input.name, candidates, code: body.code as string, message: (body.message ?? body.error) as string };
  if ((status === 200 || status === 201) && artistId) return { action: "matched", artistId, artistName: input.name, candidates };
  return { action: "error", candidates, code: body.code as string, message: (body.message ?? body.error) as string ?? `Artist lookup failed (${status})` };
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
  artistId: string;
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
}): Promise<EventResult> {
  const { status, body } = await call<Record<string, unknown>>("POST", "/api/events/community", { ...payload, source: "community_wizard" });
  const eventId = (body.eventId ?? (body.event as Record<string, unknown> | undefined)?.id ?? body.id) as string | undefined;
  if (status === 200 || status === 201) return { ok: true, eventId };
  if (status === 409) return { ok: false, existingEventId: (body.existingEventId ?? body.existingId) as string | undefined, error: "duplicate" };
  return { ok: false, error: (body.error ?? body.message) as string ?? `Publish failed (${status})` };
}
