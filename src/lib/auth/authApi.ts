// bndy-app auth API client. Cookie-session against api.bndy.co.uk.
// All calls send credentials. The session cookie lives on .bndy.co.uk.

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

export type UserRole = "user" | "curator" | "owner" | "staff";

export interface GigFilter {
  genres: string[];
  actTypes: string[];
  includeOpenMic: boolean;
  enabled: boolean;
}

const EMPTY_GIG_FILTER: GigFilter = { genres: [], actTypes: [], includeOpenMic: false, enabled: false };

function normaliseGigFilter(value: unknown): GigFilter {
  const f = (value && typeof value === "object" ? value : {}) as Partial<GigFilter>;
  return {
    genres: Array.isArray(f.genres) ? f.genres.filter((x): x is string => typeof x === "string") : [],
    actTypes: Array.isArray(f.actTypes) ? f.actTypes.filter((x): x is string => typeof x === "string") : [],
    includeOpenMic: f.includeOpenMic === true,
    enabled: f.enabled === true,
  };
}

export interface AuthUser {
  id: string;
  cognitoId: string;
  username: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  hometown?: string | null;
  profileCompleted: boolean;
  createdAt: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
  session: { issuedAt: number; expiresAt: number };
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (data as { error?: string; message?: string }).error
      || (data as { message?: string }).message
      || `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

/** GET /api/me — null when signed out. */
export async function checkAuth(): Promise<AuthSession | null> {
  try {
    const res = await fetch(`${BASE}/api/me`, { credentials: "include", cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as AuthSession;
    return data?.user ? data : null;
  } catch {
    return null;
  }
}

export async function signOut(): Promise<void> {
  try {
    await fetch(`${BASE}/auth/logout`, { method: "POST", credentials: "include" });
  } catch {
    // The cookie clear is best-effort. Local state clears regardless.
  }
}

/** Where the API should send the user after a social or magic-link sign-in. */
function returnTo(nextPath: string): string {
  const path = nextPath.startsWith("/") ? nextPath : `/${nextPath}`;
  return `${window.location.origin}${path}`;
}

export function googleAuthUrl(nextPath: string): string {
  return `${BASE}/auth/google?returnTo=${encodeURIComponent(returnTo(nextPath))}`;
}

export function appleAuthUrl(nextPath: string): string {
  return `${BASE}/auth/apple?returnTo=${encodeURIComponent(returnTo(nextPath))}`;
}

export async function requestMagicLink(email: string, nextPath: string) {
  return post<{ success: boolean; requestId: string; expiresIn: number }>(
    "/auth/email/request-magic",
    { email, returnTo: returnTo(nextPath) },
  );
}

/* ---------- favourites (backlog feature 3) ---------- */

export interface Favourites {
  artistIds: string[];
  venueIds: string[];
}

export type FavouriteType = "artist" | "venue";

export async function fetchFavourites(): Promise<Favourites> {
  const res = await fetch(`${BASE}/users/favourites`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`GET /users/favourites → ${res.status}`);
  const data = (await res.json()) as Partial<Favourites>;
  return { artistIds: data.artistIds ?? [], venueIds: data.venueIds ?? [] };
}

export async function toggleFavourite(type: FavouriteType, id: string, favourite: boolean) {
  return post<{ success: boolean }>("/users/favourites/toggle", { type, id, favourite });
}

/* ---------- saved My gigs preference ---------- */

type GigFilterProfile = { user?: { gigFilter?: unknown; [key: string]: unknown } };

async function fetchGigFilterProfile(): Promise<GigFilterProfile> {
  const res = await fetch(`${BASE}/users/profile`, { credentials: "include", cache: "no-store" });
  if (!res.ok) throw new Error(`GET /users/profile → ${res.status}`);
  return (await res.json()) as GigFilterProfile;
}

export async function fetchGigFilter(): Promise<GigFilter> {
  const data = await fetchGigFilterProfile();
  return normaliseGigFilter(data.user?.gigFilter ?? EMPTY_GIG_FILTER);
}

export async function updateGigFilter(gigFilter: GigFilter): Promise<GigFilter> {
  // Rollout guard: the old profile PUT treats unknown partial bodies as a normal
  // profile update. Only send {gigFilter} once GET /users/profile explicitly
  // exposes the new field, so a frontend/API deployment race cannot blank a profile.
  const profile = await fetchGigFilterProfile();
  if (!profile.user || !Object.prototype.hasOwnProperty.call(profile.user, "gigFilter")) {
    throw new Error("Gig preferences are still being enabled. Please try again in a moment.");
  }

  const res = await fetch(`${BASE}/users/profile`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ gigFilter }),
  });
  const data = await res.json().catch(() => ({})) as { error?: string; user?: { gigFilter?: unknown } };
  if (!res.ok) throw new Error(data.error || `PUT /users/profile → ${res.status}`);
  return normaliseGigFilter(data.user?.gigFilter ?? gigFilter);
}

export async function requestPhoneOtp(phone: string) {
  return post<{ success: boolean; requestId: string; expiresIn: number }>(
    "/auth/phone/request-otp",
    { phone },
  );
}

export async function verifyPhoneOtp(phone: string, otp: string) {
  return post<{
    success: boolean;
    phoneVerified?: boolean;
    requiresOnboarding?: boolean;
    user?: { id: string; displayName: string };
  }>("/auth/phone/verify-otp", { phone, otp });
}

export async function verifyPhoneAndOnboard(
  phone: string,
  otp: string,
  firstName: string,
  lastName: string,
  hometown: string,
) {
  return post<{ success: boolean; user: { id: string; displayName: string } }>(
    "/auth/phone/verify-and-onboard",
    { phone, otp, firstName, lastName, hometown },
  );
}

/* ---------- profile ---------- */

export interface ProfileUpdateRequest {
  firstName: string;
  lastName: string;
  displayName: string;
  hometown?: string;
  avatarUrl?: string;
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<AuthUser> {
  const res = await fetch(`${BASE}/users/profile`, {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `HTTP ${res.status}`);
  }
  const { user } = (await res.json()) as { user: AuthUser };
  return user;
}
