/**
 * SEC-AUD-005: Sanitize URLs for href attributes
 *
 * Prevents stored XSS via javascript: URLs by only allowing
 * http:// and https:// schemes. Returns undefined for invalid URLs.
 */
export function safeHref(url: string | null | undefined): string | undefined {
  if (!url) return undefined;

  const trimmed = url.trim().toLowerCase();

  // Only allow http and https schemes
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return url;
  }

  // Allow relative URLs (start with / but not //)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return url;
  }

  return undefined;
}
