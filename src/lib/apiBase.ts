/**
 * Single source of truth for the API origin.
 *
 * On *.bndy.live, CloudFront routes /api/* and /auth/* to API Gateway
 * same-origin, and the session cookie is scoped to .bndy.live. Authed calls
 * MUST therefore be same-origin there: an absolute api.bndy.co.uk call
 * carries no cookie and returns 401 (the 2026-08-19 "Not authenticated"
 * curator-save incident).
 *
 * Everywhere else (server-side rendering, localhost, legacy app domains)
 * the absolute API host is correct.
 */
export function apiBase(): string {
  if (typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")) return "";
  return process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";
}
