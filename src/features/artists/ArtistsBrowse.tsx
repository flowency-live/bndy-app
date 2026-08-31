"use client";

import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowUpDown, CalendarCheck, Heart, Music2, Search, SlidersHorizontal, Users, X } from "lucide-react";
import { useArtists, useUpcomingGigsBasic } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useArtistTaxonomy, artistTypeLabel } from "@/lib/artistTaxonomy";
import { ArtistTile } from "./ArtistTile";
import { ArtistFilterSheet } from "./ArtistFilterSheet";
import { groupByInitial, ALPHA_INDEX } from "@/domain/grouping";
import { cn } from "@/lib/cn";
import { Deferred } from "@/components/DeferredSection";
import {
  EMPTY_FILTERS, SORTS, countFacets, facetCount, facetsOf, filtersToParams,
  isDefault, matches, paramsToFilters, type BrowseFilters, type SortKey,
} from "./browseFilters";

/** Quick facets. These three are the ones people actually reach for, so they
 *  sit on the surface rather than inside the sheet. */
const QUICK: { label: string; key: "artistTypes" | "acoustic"; value?: string }[] = [
  { label: "Band", key: "artistTypes", value: "band" },
  { label: "Solo", key: "artistTypes", value: "solo" },
  { label: "Acoustic", key: "acoustic" },
];

export function ArtistsBrowse() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists } = useFavourites();
  const { data: taxonomy } = useArtistTaxonomy();

  const [filters, setFilters] = useState<BrowseFilters>(() => paramsToFilters(params));
  const [sheetOpen, setSheetOpen] = useState(false);

  // URL is the source of truth for a shareable, back-button-safe view.
  useEffect(() => {
    const next = filtersToParams(filters).toString();
    const now = params.toString();
    if (next !== now) router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const { data: artists = [], isLoading } = useArtists({ gigging: filters.giggingOnly });
  const { data: gigs = [] } = useUpcomingGigsBasic(!filters.giggingOnly);
  const gigging = useMemo(
    () => (filters.giggingOnly ? null : new Set(gigs.map((g) => g.artistId).filter((x): x is string => !!x))),
    [gigs, filters.giggingOnly],
  );

  /** Gig counts drive the "Most gigs" sort. Only fetched when not gigging-only,
   *  so in the default view the sort falls back to name order. */
  const gigCount = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gigs) if (g.artistId) m.set(g.artistId, (m.get(g.artistId) ?? 0) + 1);
    return m;
  }, [gigs]);

  // One normalisation pass per artist list, not per keystroke.
  const facets = useMemo(() => artists.map((a) => facetsOf(a, taxonomy)), [artists, taxonomy]);

  const dq = useDeferredValue(filters.q);
  const deferred = useMemo(() => ({ ...filters, q: dq }), [filters, dq]);

  const results = useMemo(() => {
    const out = artists.filter((a, i) => matches(a, facets[i], deferred, favArtists));
    if (deferred.sort === "gigs") out.sort((a, b) => (gigCount.get(b.id) ?? 0) - (gigCount.get(a.id) ?? 0) || a.name.localeCompare(b.name));
    else if (deferred.sort === "new") out.sort((a, b) => b.id.localeCompare(a.id) || a.name.localeCompare(b.name));
    else out.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    return out;
  }, [artists, facets, deferred, favArtists, gigCount]);

  const counts = useMemo(
    () => countFacets(artists, facets, deferred, favArtists),
    [artists, facets, deferred, favArtists],
  );

  const byLetter = deferred.sort === "az" && !deferred.q;
  const groups = useMemo(() => (byLetter ? groupByInitial(results, (a) => a.name) : []), [byLetter, results]);
  const present = useMemo(() => new Set(groups.map((g) => g.key)), [groups]);
  const jump = (k: string) => document.getElementById(`grp-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  const set = useCallback(<K extends keyof BrowseFilters>(key: K, value: BrowseFilters[K]) => {
    setFilters((f) => ({ ...f, [key]: value }));
  }, []);

  const toggleList = useCallback((key: "genres" | "artistTypes" | "actTypes" | "towns", value: string) => {
    setFilters((f) => {
      const list = f[key];
      return { ...f, [key]: list.includes(value) ? list.filter((x) => x !== value) : [...list, value] };
    });
  }, []);

  const clearAll = useCallback(() => setFilters((f) => ({ ...EMPTY_FILTERS, giggingOnly: f.giggingOnly, sort: f.sort })), []);
  const cycleSort = useCallback(() => setFilters((f) => {
    const i = SORTS.findIndex((s) => s.key === f.sort);
    return { ...f, sort: SORTS[(i + 1) % SORTS.length].key as SortKey };
  }), []);

  const nFacets = facetCount(filters);
  const sortLabel = SORTS.find((s) => s.key === filters.sort)?.label ?? "A to Z";

  /** Genre aisles: a way in when nothing is applied. Hidden the moment the
   *  user has narrowed anything, because then the grid is the answer. */
  const aisles = useMemo(() => {
    if (!isDefault(filters)) return [];
    return [...counts.genres.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 10);
  }, [counts.genres, filters]);

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-3 hidden lg:block">
        <h1 className="text-4xl font-black tracking-tight">Artists</h1>
        <p className="mt-1 text-[15px] font-semibold text-dim">
          {isLoading ? "Loading…" : `${artists.length.toLocaleString()} ${filters.giggingOnly ? "acts with upcoming gigs" : "acts on bndy"}`}
        </p>
      </header>

      {/* Sticky control block: search, quick facets, count and sort never scroll away. */}
      <div className="sticky top-0 z-30 -mx-4 border-b border-line bg-ink px-4 pb-2 pt-1 lg:-mx-8 lg:px-8">
        <div className="flex items-stretch gap-2">
          <div className="relative min-w-0 flex-1">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={filters.q}
              onChange={(e) => set("q", e.target.value)}
              enterKeyHint="search"
              aria-label="Search artists by name, genre or town"
              placeholder="Search artists, genres or towns…"
              className="w-full rounded-2xl border border-line glass py-3 pl-10 pr-9 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]"
            />
            {filters.q && (
              <button
                onClick={() => set("q", "")}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-lg text-dim hover:text-txt"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {isAuthenticated && (
            <button
              onClick={() => set("favouritesOnly", !filters.favouritesOnly)}
              aria-pressed={filters.favouritesOnly}
              aria-label="Show favourite artists only"
              className={cn(
                "flex w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors active:scale-95",
                filters.favouritesOnly ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_16%,var(--glass))] text-[var(--acc)]" : "border-line glass text-dim",
              )}
            >
              <Heart size={17} fill={filters.favouritesOnly ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
          )}

          <button
            onClick={() => setSheetOpen(true)}
            aria-label="Filters"
            className={cn(
              "relative flex w-11 shrink-0 items-center justify-center rounded-2xl border transition-colors active:scale-95",
              nFacets ? "border-[var(--acc)] bg-[color-mix(in_srgb,var(--acc)_16%,var(--glass))] text-[var(--acc)]" : "border-line glass text-dim",
            )}
          >
            <SlidersHorizontal size={17} />
            {nFacets > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-acc px-1 text-[9px] font-black text-on-acc">
                {nFacets}
              </span>
            )}
          </button>
        </div>

        {/* Quick facets plus whatever is currently applied. */}
        <div className="no-scrollbar mt-2 flex gap-1.5 overflow-x-auto pb-0.5">
          <button
            onClick={() => set("giggingOnly", !filters.giggingOnly)}
            aria-pressed={filters.giggingOnly}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
              filters.giggingOnly ? "border-transparent bg-acc text-on-acc" : "border-line glass text-dim",
            )}
          >
            {filters.giggingOnly ? <CalendarCheck size={13} /> : <Users size={13} />}
            {filters.giggingOnly ? "Gigging" : "All acts"}
          </button>

          {QUICK.map((qf) => {
            const on = qf.key === "acoustic" ? filters.acoustic : filters.artistTypes.includes(qf.value!);
            const n = qf.key === "acoustic" ? counts.acoustic : counts.artistTypes.get(qf.value!) ?? 0;
            return (
              <button
                key={qf.label}
                onClick={() => (qf.key === "acoustic" ? set("acoustic", !filters.acoustic) : toggleList("artistTypes", qf.value!))}
                aria-pressed={on}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                  on ? "border-transparent bg-acc text-on-acc" : "border-line glass text-dim",
                )}
              >
                {qf.label}
                <span className="font-meta text-[9.5px] opacity-70">{n}</span>
              </button>
            );
          })}

          {/* applied facets, removable */}
          {filters.genres.map((g) => (
            <Applied key={`g-${g}`} label={g} onRemove={() => toggleList("genres", g)} />
          ))}
          {filters.artistTypes.filter((t) => !QUICK.some((q) => q.value === t)).map((t) => (
            <Applied key={`t-${t}`} label={artistTypeLabel(t, taxonomy) ?? t} onRemove={() => toggleList("artistTypes", t)} />
          ))}
          {filters.actTypes.map((t) => (
            <Applied key={`a-${t}`} label={taxonomy.actTypes.find((x) => x.value === t)?.label ?? t} onRemove={() => toggleList("actTypes", t)} />
          ))}
          {filters.towns.map((t) => (
            <Applied key={`w-${t}`} label={t} onRemove={() => toggleList("towns", t)} />
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between gap-3">
          <span className="font-meta text-[10.5px] uppercase tracking-[1.1px] text-dim2">
            <b className="text-txt">{isLoading ? "…" : results.length.toLocaleString()}</b> act{results.length === 1 ? "" : "s"}
            {(nFacets > 0 || filters.q || filters.favouritesOnly) && " · filtered"}
          </span>
          <div className="flex items-center gap-3">
            {!isDefault(filters) && (
              <button onClick={clearAll} className="font-meta text-[10.5px] font-bold uppercase tracking-[1.1px] text-dim hover:text-txt">
                Clear
              </button>
            )}
            <button onClick={cycleSort} className="font-meta flex items-center gap-1.5 text-[10.5px] font-bold uppercase tracking-[1.1px] text-[var(--acc)]">
              <ArrowUpDown size={12} /> {sortLabel}
            </button>
          </div>
        </div>
      </div>

      {/* Genre aisles: the way in when nothing is applied. */}
      {aisles.length > 0 && !isLoading && (
        <section className="mt-4">
          <h2 className="mb-2 flex items-center gap-1.5 text-[13px] font-black tracking-tight">
            <Music2 size={14} className="text-[var(--acc)]" /> Jump into a genre
          </h2>
          <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {aisles.map(([g, n]) => (
              <button
                key={g}
                onClick={() => toggleList("genres", g)}
                className="bndy-card flex h-[70px] w-[124px] shrink-0 flex-col justify-end border border-line bg-card p-2.5 text-left"
              >
                <span className="text-[14px] font-black leading-tight">{g}</span>
                <span className="font-meta text-[9.5px] text-dim2">{n} acts</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
          {Array.from({ length: 14 }).map((_, i) => (
            <div key={i} className="bndy-tile aspect-square animate-pulse border border-line bg-card" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="py-16 text-center">
          <p className="font-semibold text-dim">No acts match those filters.</p>
          <button onClick={clearAll} className="mt-3 text-[13px] font-extrabold text-[var(--acc)]">Clear filters</button>
        </div>
      ) : byLetter ? (
        <>
          {(() => {
            let idx = 0;
            return groups.map((g) => (
              <section key={g.key} id={`grp-${g.key}`} className="scroll-mt-32">
                <div className="mb-2 mt-5 flex items-baseline gap-2 border-b border-line pb-1">
                  <span className="text-[18px] font-black text-[var(--acc)]">{g.key}</span>
                  <span className="text-[11px] font-bold text-dim2">{g.items.length}</span>
                </div>
                <Deferred count={g.items.length}>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
                    {g.items.map((a) => <ArtistTile key={a.id} artist={a} gigging={gigging?.has(a.id)} priority={idx++ < 8} />)}
                  </div>
                </Deferred>
              </section>
            ));
          })()}

          <nav aria-label="Jump to letter" className="fixed right-1 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-px rounded-full border border-line glass px-1 py-2">
            {ALPHA_INDEX.map((k) => {
              const on = present.has(k);
              return (
                <button
                  key={k}
                  disabled={!on}
                  onClick={() => jump(k)}
                  className={cn("h-[15px] w-5 rounded text-[10px] font-black leading-none transition-colors", on ? "text-[var(--acc)] hover:bg-white/10" : "text-dim2/40")}
                >
                  {k}
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <Deferred count={results.length}>
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
            {results.map((a, i) => <ArtistTile key={a.id} artist={a} gigging={gigging?.has(a.id)} priority={i < 8} />)}
          </div>
        </Deferred>
      )}

      <ArtistFilterSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        filters={filters}
        counts={counts}
        taxonomy={taxonomy}
        resultCount={results.length}
        onToggle={toggleList}
        onClear={clearAll}
      />
    </div>
  );
}

function Applied({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      aria-label={`Remove filter ${label}`}
      className="flex shrink-0 items-center gap-1.5 rounded-full border border-transparent bg-acc px-3 py-1.5 text-[12.5px] font-bold text-on-acc"
    >
      {label}
      <X size={12} strokeWidth={3} />
    </button>
  );
}
