// bndy-app auth API client. Cookie-session against api.bndy.co.uk.
// All calls send credentials. The session cookie lives on .bndy.co.uk.

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

export type UserRole = "user" | "curator" | "owner" | "staff";

export interface AuthUser {
  id: string;
  cognitoId: string;
  username: string;
  email: string | null;
  firstName?: string | null;
  lastName?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
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
