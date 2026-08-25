const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

export interface ArtistAutocompleteMatch {
  id: string;
  name: string;
  location?: string;
  profileImageUrl?: string;
  matchScore?: number;
}

export async function searchArtistAutocomplete(name: string): Promise<ArtistAutocompleteMatch[]> {
  const query = name.trim();
  if (query.length < 2) return [];

  const response = await fetch(`${BASE}/api/artists/search?name=${encodeURIComponent(query)}`);
  if (!response.ok) return [];

  const body = (await response.json().catch(() => ({}))) as { matches?: ArtistAutocompleteMatch[] };
  return Array.isArray(body.matches) ? body.matches : [];
}
