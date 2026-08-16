"use client";

import { useQuery } from "@tanstack/react-query";

export interface TaxonomyOption {
  value: string;
  label: string;
}

export interface PerformanceCapability extends TaxonomyOption {
  field: string;
  type: "boolean";
}

export interface ArtistTaxonomy {
  version: string;
  genres: string[];
  artistTypes: TaxonomyOption[];
  actTypes: TaxonomyOption[];
  performanceCapabilities: PerformanceCapability[];
}

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

/**
 * Resilience snapshot only. The Artists API is the authority; this keeps the
 * gig discovery UI usable during a transient API/deploy mismatch and must not
 * be treated as an independently editable taxonomy.
 */
export const FALLBACK_ARTIST_TAXONOMY: ArtistTaxonomy = {
  version: "2026-08-16-fallback",
  genres: [
    "Rock", "Rock n Roll", "Grunge", "Metal", "Punk", "Alternative", "New Wave",
    "Pop", "Indie", "Britpop", "Mod",
    "Blues", "R&B", "Country", "Americana",
    "Folk", "Soul", "Funk", "Motown",
    "Electronic", "Dance",
    "Jazz", "Classical", "Reggae", "Latin",
    "Other",
  ],
  artistTypes: [
    { value: "band", label: "Band" },
    { value: "solo", label: "Solo Act" },
    { value: "duo", label: "Duo" },
    { value: "trio", label: "Trio" },
    { value: "group", label: "Group" },
    { value: "dj", label: "DJ" },
    { value: "collective", label: "Collective" },
  ],
  actTypes: [
    { value: "originals", label: "Originals" },
    { value: "covers", label: "Covers" },
    { value: "tribute", label: "Tribute Act" },
  ],
  performanceCapabilities: [
    { value: "acoustic", label: "Acoustic performances", field: "acoustic", type: "boolean" },
  ],
};

function validTaxonomy(value: unknown): value is ArtistTaxonomy {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<ArtistTaxonomy>;
  return typeof v.version === "string"
    && Array.isArray(v.genres)
    && Array.isArray(v.artistTypes)
    && Array.isArray(v.actTypes)
    && Array.isArray(v.performanceCapabilities);
}

export async function fetchArtistTaxonomy(): Promise<ArtistTaxonomy> {
  try {
    const res = await fetch(`${BASE}/api/artists/taxonomy`, { cache: "no-store" });
    if (!res.ok) throw new Error(`taxonomy ${res.status}`);
    const body: unknown = await res.json();
    if (!validTaxonomy(body)) throw new Error("invalid taxonomy response");
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

export function artistTypeLabel(value?: string | null, taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY): string | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return taxonomy.artistTypes.find((option) => option.value.toLowerCase() === key || option.label.toLowerCase() === key)?.label ?? value;
}

export function canonicalArtistType(value?: string | null, taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY): string | undefined {
  if (!value) return undefined;
  const key = value.trim().toLowerCase();
  return taxonomy.artistTypes.find((option) => option.value.toLowerCase() === key || option.label.toLowerCase() === key)?.value;
}

/**
 * Read-compatibility for records written before the taxonomy boundary existed.
 * It deliberately recognises labels as well as machine values and extracts the
 * old `acoustic` pseudo-act into the separate capability flag.
 */
export function canonicalActTypes(
  values?: string[] | null,
  taxonomy: ArtistTaxonomy = FALLBACK_ARTIST_TAXONOMY,
): { actTypes: string[]; acousticFromLegacy: boolean } {
  const actTypes: string[] = [];
  let acousticFromLegacy = false;
  const seen = new Set<string>();

  for (const raw of values ?? []) {
    const key = String(raw).trim().toLowerCase();
    if (!key) continue;
    if (key === "acoustic") {
      acousticFromLegacy = true;
      continue;
    }
    const option = taxonomy.actTypes.find((item) => item.value.toLowerCase() === key || item.label.toLowerCase() === key);
    if (option && !seen.has(option.value)) {
      seen.add(option.value);
      actTypes.push(option.value);
    }
  }

  return { actTypes, acousticFromLegacy };
}
