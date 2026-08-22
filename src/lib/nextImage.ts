const OPTIMISED_REMOTE_SUFFIXES = [".bndy.co.uk", ".amazonaws.com", ".fbcdn.net"];
const OPTIMISED_REMOTE_ROOTS = new Set(["bndy.co.uk", "amazonaws.com", "fbcdn.net"]);

/** Keep Next's image optimiser restricted to the same host families declared in
 * next.config.ts. Unknown organiser hotlinks continue to use a plain img rather
 * than turning bndy into an open image proxy. */
export function canUseNextImage(src: string): boolean {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    return OPTIMISED_REMOTE_ROOTS.has(host) || OPTIMISED_REMOTE_SUFFIXES.some((suffix) => host.endsWith(suffix));
  } catch {
    return false;
  }
}
