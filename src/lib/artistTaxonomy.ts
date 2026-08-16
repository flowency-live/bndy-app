"use client";

import { useQuery } from "@tanstack/react-query";
import {
  FALLBACK_ARTIST_TAXONOMY,
  validArtistTaxonomy,
  type ArtistTaxonomy,
} from "@/lib/artistTaxonomyCore";

export * from "@/lib/artistTaxonomyCore";

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

export async function fetchArtistTaxonomy(): Promise<ArtistTaxonomy> {
  try {
    const res = await fetch(`${BASE}/api/artists/taxonomy`, { cache: "no-store" });
    if (!res.ok) throw new Error(`taxonomy ${res.status}`);
    const body: unknown = await res.json();
    if (!validArtistTaxonomy(body)) throw new Error("invalid taxonomy response");
    return body;
  } catch {
    return FALLBACK_ARTIST_TAXONOMY;
  }
}

export function useArtistTaxonomy() {
  const query = useQuery({
    queryKey: ["artist-taxonomy"],
    queryFn: fetchArtistTaxonomy,
    staleTime: 60 * 60 * 1000,
    gcTime: 24 * 60 * 60 * 1000,
    retry: 1,
  });
  return { ...query, data: query.data ?? FALLBACK_ARTIST_TAXONOMY };
}
