const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body.error || `Request failed (${response.status})`) as Error & { code?: string; inviteRequired?: boolean };
    error.code = body.code;
    error.inviteRequired = body.inviteRequired;
    throw error;
  }
  return body as T;
}

export type ManagedArtist = {
  id: string;
  name: string;
  role: string;
  membershipId: string;
  location?: string;
  profileImageUrl?: string;
};

export type ManagedVenue = {
  id: string;
  name: string;
  role: string;
  membershipId: string;
  address?: string;
  city?: string;
  profileImageUrl?: string;
};

export type EntityMember = {
  membership_id: string;
  entity_id: string;
  user_id: string;
  role: string;
  status: string;
  user?: { email?: string | null; displayName?: string | null } | null;
};

export type EntityInvite = {
  token: string;
  entityType: "venue";
  entityId: string;
  entityName: string;
  role: "admin" | "member";
  emailHint?: string | null;
  expiresAt: number;
};

export async function getManagedArtists(): Promise<ManagedArtist[]> {
  const body = await request<{ artists?: Array<Record<string, unknown>> }>("/api/memberships/me");
  return (body.artists || []).map((membership) => {
    const artist = (membership.artist || {}) as Record<string, unknown>;
    return {
      id: String(artist.id || membership.artist_id || membership.id || ""),
      name: String(artist.name || membership.name || "Artist"),
      role: String(membership.role || "member"),
      membershipId: String(membership.membership_id || membership.id || ""),
      location: artist.location as string | undefined,
      profileImageUrl: artist.profileImageUrl as string | undefined,
    };
  }).filter((artist) => artist.id);
}

export async function getManagedVenues(): Promise<ManagedVenue[]> {
  const body = await request<{ entities?: ManagedVenue[] }>("/api/managed-entities/me");
  return body.entities || [];
}

export async function getVenueMembers(venueId: string): Promise<EntityMember[]> {
  const body = await request<{ memberships?: EntityMember[] }>(`/api/managed-entities/${venueId}/members`);
  return body.memberships || [];
}

export async function addVenueDelegate(venueId: string, email: string, role: "admin" | "member" = "admin"): Promise<EntityMember> {
  const body = await request<{ membership: EntityMember }>(`/api/managed-entities/${venueId}/members`, {
    method: "POST",
    body: JSON.stringify({ entityType: "venue", email, role }),
  });
  return body.membership;
}

export async function createVenueDelegateInvite(venueId: string, email: string, role: "admin" | "member" = "admin"): Promise<{ invite: EntityInvite; inviteLink: string }> {
  return request<{ invite: EntityInvite; inviteLink: string }>(`/api/managed-entities/${venueId}/invites`, {
    method: "POST",
    body: JSON.stringify({ email, role }),
  });
}

export async function getEntityInvite(token: string): Promise<EntityInvite> {
  return request<EntityInvite>(`/api/entity-invites/${encodeURIComponent(token)}`);
}

export async function acceptEntityInvite(token: string): Promise<{ action: "accepted" | "already_member"; membership: EntityMember; entity?: { id: string; type: string; name: string } }> {
  return request<{ action: "accepted" | "already_member"; membership: EntityMember; entity?: { id: string; type: string; name: string } }>(`/api/entity-invites/${encodeURIComponent(token)}/accept`, { method: "POST", body: JSON.stringify({}) });
}

export async function revokeVenueDelegate(membershipId: string): Promise<EntityMember> {
  const body = await request<{ membership: EntityMember }>(`/api/entity-memberships/${membershipId}`, {
    method: "PATCH",
    body: JSON.stringify({ status: "revoked" }),
  });
  return body.membership;
}

export async function transferVenueOwnership(venueId: string, email: string): Promise<{ entityId: string; ownerUserId: string; previousOwnerRole: string }> {
  return request<{ entityId: string; ownerUserId: string; previousOwnerRole: string }>(`/api/managed-entities/${venueId}/transfer`, {
    method: "POST",
    body: JSON.stringify({ email }),
  });
}

export async function createArtistInviteLink(artistId: string): Promise<string> {
  const body = await request<{ inviteLink: string }>(`/api/artists/${artistId}/invites/general`, { method: "POST", body: JSON.stringify({}) });
  return body.inviteLink;
}

export async function getMyClaims(): Promise<Array<{ claim_id: string; entity_type: "artist" | "venue"; entity_id: string; entity_name: string; status: string; created_at: string }>> {
  const body = await request<{ claims?: Array<{ claim_id: string; entity_type: "artist" | "venue"; entity_id: string; entity_name: string; status: string; created_at: string }> }>("/api/claims/me");
  return body.claims || [];
}
