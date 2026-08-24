const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

export interface JoinArtistInput {
  name: string;
  location: string;
  artistType?: string;
  actType?: string[];
  acoustic?: boolean;
  genres?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  bio?: string;
  profileImageUrl?: string;
}

export type JoinArtistResult =
  | { ok: true; artist: { id: string; name: string; location?: string; ownerUserId?: string }; relationship: { id: string; role: "owner"; status: string } }
  | { ok: false; kind: "existing"; artist?: { id: string; name: string; location?: string; nameVariants?: string[] } | null; candidates: Array<{ id: string; name: string; location?: string; nameVariants?: string[] }>; matchedBy?: string | null; matchedVariant?: string | null }
  | { ok: false; kind: "error"; message: string; code?: string };

export async function joinArtist(input: JoinArtistInput): Promise<JoinArtistResult> {
  const response = await fetch(`${BASE}/api/join/artists`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status === 201) return { ok: true, artist: body.artist as { id: string; name: string; location?: string; ownerUserId?: string }, relationship: body.relationship as { id: string; role: "owner"; status: string } };
  if (response.status === 409 && body.code === "EXISTING_ENTITY") return { ok: false, kind: "existing", artist: (body.artist as { id: string; name: string; location?: string; nameVariants?: string[] } | null | undefined) ?? null, candidates: (body.candidates as Array<{ id: string; name: string; location?: string; nameVariants?: string[] }> | undefined) ?? [], matchedBy: body.matchedBy as string | null | undefined, matchedVariant: (body.variant ?? body.matchedVariant) as string | null | undefined };
  return { ok: false, kind: "error", message: (body.error as string | undefined) ?? `Join failed (${response.status})`, code: body.code as string | undefined };
}

export interface JoinVenueIdentity {
  name: string;
  address: string;
  city?: string;
  googlePlaceId: string;
  latitude: number;
  longitude: number;
  website?: string;
  phone?: string;
  postcode?: string;
  socialMediaUrls?: string[];
}
export interface JoinVenueCandidate { id: string; name: string; address?: string; city?: string; googlePlaceId?: string; matchMethod?: string; matchConfidence?: number }

export async function checkJoinVenue(input: JoinVenueIdentity): Promise<{ existing: JoinVenueCandidate | null; clear: boolean; message?: string }> {
  const response = await fetch(`${BASE}/api/community/venues/find-or-create`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...input, canCreate: false, source: "join_bndy_preflight" }) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status !== 200) return { existing: null, clear: false, message: (body.error as string | undefined) ?? "We couldn't safely verify that venue." };
  if (body.id) return { existing: { id: body.id as string, name: (body.name as string) ?? input.name, address: body.address as string | undefined, city: body.city as string | undefined, googlePlaceId: body.googlePlaceId as string | undefined, matchMethod: body.matchMethod as string | undefined, matchConfidence: body.matchConfidence as number | undefined }, clear: false };
  if (body.action === "review") return { existing: null, clear: true };
  return { existing: null, clear: false, message: "We couldn't determine whether this venue is already on bndy." };
}

export type JoinVenueResult =
  | { ok: true; venue: { id: string; name: string; address?: string; city?: string; ownerUserId?: string }; relationship: { id: string; role: "owner"; status: string } }
  | { ok: false; kind: "existing"; venue: JoinVenueCandidate | null }
  | { ok: false; kind: "error"; message: string; code?: string };

export async function joinVenue(input: JoinVenueIdentity): Promise<JoinVenueResult> {
  const response = await fetch(`${BASE}/api/join/venues`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.status === 201) return { ok: true, venue: body.venue as { id: string; name: string; address?: string; city?: string; ownerUserId?: string }, relationship: body.relationship as { id: string; role: "owner"; status: string } };
  if (response.status === 409 && body.code === "EXISTING_ENTITY") return { ok: false, kind: "existing", venue: (body.venue as JoinVenueCandidate | null | undefined) ?? null };
  return { ok: false, kind: "error", message: (body.error as string | undefined) ?? `Join failed (${response.status})`, code: body.code as string | undefined };
}

export interface JoinClaim { claim_id: string; entity_type: "artist" | "venue"; entity_id: string; entity_name: string; requested_role: "owner" | "admin"; status: "pending" | "approved" | "rejected" | "cancelled"; created_at: string }

export async function requestJoinClaim(input: { entityType: "artist" | "venue"; entityId: string; requestedRole?: "owner" | "admin"; evidenceHints?: Record<string, string> }): Promise<{ ok: true; claim?: JoinClaim; alreadyOwned?: boolean } | { ok: false; message: string }> {
  const response = await fetch(`${BASE}/api/claims`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;
  if (response.ok) return { ok: true, claim: body.claim as JoinClaim | undefined, alreadyOwned: body.action === "already_owned" };
  return { ok: false, message: (body.error as string | undefined) ?? `Claim request failed (${response.status})` };
}
