// Artist browse: filter state, matching and counting.
// Pure module, no React, so it is testable and reusable by the URL sync.
//
// Scope note (Jason 2026-08-21): this page answers WHO, not WHEN. The map and
// the gigs page own dates and proximity. The only date-aware control here is
// the existing gigging toggle, which the API already serves.

import type { Artist } from "@/domain/types";
import { canonicalActTypes, canonicalArtistType, type ArtistTaxonomy } from "@/lib/artistTaxonomyCore";

export type SortKey = "az" | "gigs" | "new";

export const SORTS: { key: SortKey; label: string }[] = [
  { key: "az", label: "A to Z" },
  { key: "gigs", label: "Most gigs" },
  { key: "new", label: "Recently added" },
];

export interface BrowseFilters {
  q: string;
  genres: string[];
  /** taxonomy artistType values: band, solo, duo, trio, group, dj, collective */
  artistTypes: string[];
  /** taxonomy actType values: originals, covers, tribute */
  actTypes: string[];
  acoustic: boolean;
  towns: string[];
  favouritesOnly: boolean;
  giggingOnly: boolean;
  sort: SortKey;
}

export const EMPTY_FILTERS: BrowseFilters = {
  q: "",
  genres: [],
  artistTypes: [],
  actTypes: [],
  acoustic: false,
  towns: [],
  favouritesOnly: false,
  giggingOnly: true,
  sort: "az",
};

/** Count of facet selections only. Search, favourites, gigging and sort are
 *  shown separately, so they do not inflate the "filters applied" badge. */
export function facetCount(f: BrowseFilters): number {
  return f.genres.length + f.artistTypes.length + f.actTypes.length + f.towns.length + (f.acoustic ? 1 : 0);
}

export function isDefault(f: BrowseFilters): boolean {
  return facetCount(f) === 0 && !f.q && !f.favouritesOnly;
}

/* ---------------- URL sync ---------------- */

export function filtersToParams(f: BrowseFilters): URLSearchParams {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.genres.length) p.set("genre", f.genres.join(","));
  if (f.artistTypes.length) p.set("type", f.artistTypes.join(","));
  if (f.actTypes.length) p.set("act", f.actTypes.join(","));
  if (f.acoustic) p.set("acoustic", "1");
  if (f.towns.length) p.set("town", f.towns.join(","));
  if (f.favouritesOnly) p.set("fav", "1");
  if (!f.giggingOnly) p.set("all", "1");
  if (f.sort !== "az") p.set("sort", f.sort);
  return p;
}

/** Accepts URLSearchParams or Next's ReadonlyURLSearchParams. */
export interface ReadableParams { get(key: string): string | null }

export function paramsToFilters(p: ReadableParams): BrowseFilters {
  const list = (k: string) => (p.get(k) ? p.get(k)!.split(",").filter(Boolean) : []);
  const sort = p.get("sort");
  return {
    q: p.get("q") ?? "",
    genres: list("genre"),
    artistTypes: list("type"),
    actTypes: list("act"),
    acoustic: p.get("acoustic") === "1",
    towns: list("town"),
    favouritesOnly: p.get("fav") === "1",
    giggingOnly: p.get("all") !== "1",
    sort: SORTS.some((s) => s.key === sort) ? (sort as SortKey) : "az",
  };
}

/* ---------------- artist facet extraction ---------------- */

/** The town shown on the tile and used by the area facet. Artist location is
 *  free text ("Stoke-on-Trent", "Derbyshire, UK"), so take the first segment. */
export function artistTown(a: Artist): string | undefined {
  const raw = a.location?.trim();
  if (!raw) return undefined;
  return raw.split(",")[0].trim() || undefined;
}

export interface ArtistFacets {
  genres: string[];
  artistType?: string;
  actTypes: string[];
  acoustic: boolean;
  town?: string;
}

/** Normalise one artist once. Callers memoise the whole list. */
export function facetsOf(a: Artist, taxonomy: ArtistTaxonomy): ArtistFacets {
  const { actTypes, acousticFromLegacy } = canonicalActTypes(a.actType, taxonomy);
  return {
    genres: a.genres ?? [],
    artistType: canonicalArtistType(a.artistType, taxonomy),
    actTypes,
    acoustic: a.acoustic === true || acousticFromLegacy,
    town: artistTown(a),
  };
}

/* ---------------- matching ---------------- */

function textMatch(a: Artist, f: ArtistFacets, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  if (a.name.toLowerCase().includes(needle)) return true;
  if (f.town?.toLowerCase().includes(needle)) return true;
  return f.genres.some((g) => g.toLowerCase().includes(needle));
}

/** One artist against the filter set. `favourites` is the id set from the hook. */
export function matches(
  a: Artist,
  f: ArtistFacets,
  filters: BrowseFilters,
  favourites: Set<string>,
): boolean {
  if (filters.favouritesOnly && !favourites.has(a.id)) return false;
  if (filters.acoustic && !f.acoustic) return false;
  if (filters.genres.length && !filters.genres.some((g) => f.genres.includes(g))) return false;
  if (filters.artistTypes.length && !(f.artistType && filters.artistTypes.includes(f.artistType))) return false;
  if (filters.actTypes.length && !filters.actTypes.some((t) => f.actTypes.includes(t))) return false;
  if (filters.towns.length && !(f.town && filters.towns.includes(f.town))) return false;
  return textMatch(a, f, filters.q);
}

/* ---------------- facet counts ---------------- */

export interface FacetCounts {
  genres: Map<string, number>;
  artistTypes: Map<string, number>;
  actTypes: Map<string, number>;
  towns: Map<string, number>;
  acoustic: number;
}

/** Counts for the filter sheet. Each dimension is counted with its OWN
 *  selection removed, so a count never reads zero for something you can pick.
 *  One pass per dimension over the already-loaded list: cheap at 5k rows,
 *  and memoised by the caller on [artists, filters, favourites]. */
export function countFacets(
  artists: Artist[],
  facets: ArtistFacets[],
  filters: BrowseFilters,
  favourites: Set<string>,
): FacetCounts {
  const out: FacetCounts = {
    genres: new Map(),
    artistTypes: new Map(),
    actTypes: new Map(),
    towns: new Map(),
    acoustic: 0,
  };
  const bump = (m: Map<string, number>, k?: string) => { if (k) m.set(k, (m.get(k) ?? 0) + 1); };

  const without = (key: keyof BrowseFilters): BrowseFilters => ({ ...filters, [key]: Array.isArray(filters[key]) ? [] : false } as BrowseFilters);
  const fGenre = without("genres");
  const fType = without("artistTypes");
  const fAct = without("actTypes");
  const fTown = without("towns");
  const fAcoustic = without("acoustic");

  for (let i = 0; i < artists.length; i++) {
    const a = artists[i];
    const f = facets[i];
    if (matches(a, f, fGenre, favourites)) for (const g of f.genres) bump(out.genres, g);
    if (matches(a, f, fType, favourites)) bump(out.artistTypes, f.artistType);
    if (matches(a, f, fAct, favourites)) for (const t of f.actTypes) bump(out.actTypes, t);
    if (matches(a, f, fTown, favourites)) bump(out.towns, f.town);
    if (f.acoustic && matches(a, f, fAcoustic, favourites)) out.acoustic += 1;
  }
  return out;
}

/** Towns worth offering as a facet: the busiest first, long tail dropped. */
export function topTowns(counts: Map<string, number>, limit = 24): string[] {
  return [...counts.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([t]) => t);
}
