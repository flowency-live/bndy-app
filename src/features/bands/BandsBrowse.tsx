"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Heart, Search } from "lucide-react";
import { useBrassBands, useBrassConcerts } from "@/editions/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { ArtistTile } from "@/features/artists/ArtistTile";
import { groupByInitial, ALPHA_INDEX } from "@/domain/grouping";
import { cn } from "@/lib/cn";
import { Deferred } from "@/components/DeferredSection";

export function BandsBrowse() {
  const { data: bands = [], isLoading } = useBrassBands();
  const { data: concerts = [] } = useBrassConcerts();
  const performing = useMemo(() => new Set(concerts.map((g) => g.artistId).filter((x): x is string => !!x)), [concerts]);
  const [q, setQ] = useState("");
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;

  const dq = useDeferredValue(q);
  const groups = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let list = [...bands].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    if (favActive) list = list.filter((a) => favArtists.has(a.id));
    if (query) {
      list = list.filter((a) =>
        a.name.toLowerCase().includes(query) ||
        a.location?.toLowerCase().includes(query) ||
        a.names?.some((name) => name.name.toLowerCase().includes(query)),
      );
    }
    return groupByInitial(list, (a) => a.name);
  }, [bands, dq, favActive, favArtists]);

  const present = useMemo(() => new Set(groups.map((g) => g.key)), [groups]);
  const jump = (key: string) => document.getElementById(`band-grp-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-4 hidden lg:block">
        <h1 className="text-4xl font-black tracking-tight">Bands</h1>
        <p className="mt-1 text-[15px] font-semibold text-dim">
          {isLoading ? "Loading…" : `${bands.length} brass bands on bndy`}
        </p>
      </header>

      <div className="mb-3 flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1 lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 hidden -translate-y-1/2 text-dim lg:block" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            aria-label="Search brass bands by name or location"
            placeholder="Search bands or locations…"
            className={cn(
              "h-full w-full rounded-2xl border border-line glass py-3 text-left text-[15px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]",
              "pl-4 lg:pl-10",
              isAuthenticated ? "pr-12" : "pr-4",
            )}
          />
          {isAuthenticated && (
            <button
              onClick={() => setFavOnly((value) => !value)}
              aria-pressed={favOnly}
              aria-label="Show favourite bands only"
              className={cn(
                "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl transition-colors active:scale-95",
                favOnly ? "text-[var(--acc)]" : "text-dim",
              )}
            >
              <Heart size={18} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <div
          className="flex w-[76px] shrink-0 flex-col items-center justify-center rounded-[var(--rad)] border border-line px-2 py-2 text-center"
          style={{ background: "color-mix(in srgb, var(--acc) 10%, var(--glass))", borderColor: "color-mix(in srgb, var(--acc) 30%, var(--line))" }}
        >
          <div className="tnum text-[18px] font-black leading-none text-txt">{isLoading ? "…" : bands.length}</div>
          <div className="font-meta mt-1 text-[8px] font-extrabold uppercase tracking-[1.5px] text-[var(--acc)]">Bands</div>
        </div>
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl border border-line bg-card" />)}
        </div>
      ) : groups.length ? (
        <>
          {groups.map((group) => (
            <section key={group.key} id={`band-grp-${group.key}`} className="scroll-mt-2">
              <div className="sticky top-0 z-10 -mx-4 mb-3 mt-6 flex items-baseline gap-2 bg-ink px-4 py-2 lg:-mx-8 lg:px-8">
                <span className="text-[20px] font-black text-[var(--acc)] brand-glow">{group.key}</span>
                <span className="text-[11px] font-bold text-dim2">{group.items.length}</span>
              </div>
              <Deferred count={group.items.length}>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
                  {group.items.map((band) => (
                    <ArtistTile
                      key={band.id}
                      artist={band}
                      gigging={performing.has(band.id)}
                      hrefBase="/bands"
                      activeLabel="Concert coming up"
                    />
                  ))}
                </div>
              </Deferred>
            </section>
          ))}

          <nav aria-label="Jump to letter" className="fixed right-1 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-px rounded-full border border-line glass px-1 py-2">
            {ALPHA_INDEX.map((key) => {
              const enabled = present.has(key);
              return (
                <button
                  key={key}
                  disabled={!enabled}
                  onClick={() => jump(key)}
                  className={cn("h-[15px] w-5 rounded text-[10px] font-black leading-none transition-colors", enabled ? "text-[var(--acc)] hover:bg-white/10" : "text-dim2/40")}
                >
                  {key}
                </button>
              );
            })}
          </nav>
        </>
      ) : (
        <p className="py-16 text-center font-semibold text-dim">No brass bands found.</p>
      )}
    </div>
  );
}
