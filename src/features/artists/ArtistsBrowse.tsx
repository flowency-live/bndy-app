"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { CalendarCheck, Heart, Search, Users } from "lucide-react";
import { useArtists, useUpcomingGigsBasic } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { ArtistTile } from "./ArtistTile";
import { groupByInitial, ALPHA_INDEX } from "@/domain/grouping";
import { cn } from "@/lib/cn";
import { Deferred } from "@/components/DeferredSection";

export function ArtistsBrowse() {
  const [giggingOnly, setGiggingOnly] = useState(true);
  const { data: artists = [], isLoading } = useArtists({ gigging: giggingOnly });
  // When showing all artists, we need gigging indicator data
  const { data: gigs = [] } = useUpcomingGigsBasic(!giggingOnly);
  const gigging = useMemo(
    () => giggingOnly ? null : new Set(gigs.map((g) => g.artistId).filter((x): x is string => !!x)),
    [gigs, giggingOnly],
  );
  const [q, setQ] = useState("");
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;

  const dq = useDeferredValue(q);
  const groups = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let list = [...artists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    if (favActive) list = list.filter((a) => favArtists.has(a.id));
    if (query) list = list.filter((a) => a.name.toLowerCase().includes(query) || (a.genres ?? []).some((g) => g.toLowerCase().includes(query)));
    return groupByInitial(list, (a) => a.name);
  }, [artists, dq, favActive, favArtists]);

  const present = useMemo(() => new Set(groups.map((g) => g.key)), [groups]);
  const jump = (k: string) => document.getElementById(`grp-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-4 hidden lg:block">
        <h1 className="text-4xl font-black tracking-tight">Artists</h1>
        <p className="mt-1 text-[15px] font-semibold text-dim">
          {isLoading ? "Loading…" : giggingOnly ? `${artists.length} artists with upcoming gigs` : `${artists.length} artists on bndy`}
        </p>
      </header>

      <div className="mb-3 flex items-stretch gap-2 lg:hidden">
        <div className="relative min-w-0 flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            aria-label="Search artists by name or genre"
            placeholder="Search artists or genres…"
            className={cn(
              "h-full w-full rounded-2xl border border-line glass py-3 pl-4 text-left text-[15px] font-semibold outline-none placeholder:text-left placeholder:text-dim focus:border-[var(--acc)]",
              isAuthenticated ? "pr-12" : "pr-4",
            )}
          />
          {isAuthenticated && (
            <button
              onClick={() => setFavOnly((v) => !v)}
              aria-pressed={favOnly}
              aria-label="Show favourite artists only"
              style={favOnly ? { background: "color-mix(in srgb, var(--acc) 18%, transparent)" } : undefined}
              className={cn(
                "absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl transition-colors active:scale-95",
                favOnly ? "text-[var(--acc)]" : "text-dim",
              )}
            >
              <Heart size={18} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.5} />
            </button>
          )}
        </div>
        <button
          onClick={() => setGiggingOnly((v) => !v)}
          aria-pressed={giggingOnly}
          aria-label={giggingOnly ? "Show all artists" : "Show only artists with upcoming gigs"}
          className={cn(
            "flex w-[76px] shrink-0 flex-col items-center justify-center rounded-2xl border px-2 py-2 text-center transition-colors active:scale-95",
            giggingOnly
              ? "border-[color-mix(in_srgb,var(--acc)_30%,var(--line))] bg-[color-mix(in_srgb,var(--acc)_10%,var(--glass))]"
              : "border-line glass",
          )}
        >
          <div className="flex items-center gap-1">
            {giggingOnly ? <CalendarCheck size={14} className="text-[var(--acc)]" /> : <Users size={14} className="text-dim" />}
            <span className="tnum text-[18px] font-black leading-none text-txt">{isLoading ? "…" : artists.length}</span>
          </div>
          <div className={cn("font-meta mt-1 text-[8px] font-extrabold uppercase tracking-[1.5px]", giggingOnly ? "text-[var(--acc)]" : "text-dim")}>
            {giggingOnly ? "Gigging" : "All"}
          </div>
        </button>
      </div>

      <div className="mb-2 hidden items-center gap-2 lg:flex lg:max-w-xl">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            enterKeyHint="search"
            aria-label="Search artists by name or genre"
            placeholder="Search artists or genres…"
            className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
          />
        </div>
        <button
          onClick={() => setGiggingOnly((v) => !v)}
          aria-pressed={giggingOnly}
          aria-label={giggingOnly ? "Show all artists" : "Show only artists with upcoming gigs"}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-3 text-[13px] font-bold transition-colors active:scale-95",
            giggingOnly
              ? "border-[color-mix(in_srgb,var(--acc)_60%,transparent)] bg-[color-mix(in_srgb,var(--acc)_22%,var(--glass))] text-[var(--acc)]"
              : "border-line glass text-dim hover:text-txt",
          )}
        >
          {giggingOnly ? <CalendarCheck size={16} /> : <Users size={16} />}
          {giggingOnly ? "Gigging" : "All artists"}
        </button>
        {isAuthenticated && (
          <button
            onClick={() => setFavOnly((v) => !v)}
            aria-pressed={favOnly}
            aria-label="Show favourite artists only"
            style={favOnly ? { borderColor: "color-mix(in srgb, var(--acc) 60%, transparent)", background: "color-mix(in srgb, var(--acc) 22%, var(--glass))" } : undefined}
            className={cn("flex shrink-0 items-center justify-center rounded-2xl border border-line glass p-3 transition-colors active:scale-95", favOnly ? "text-[var(--acc)]" : "text-dim")}
          >
            <Heart size={17} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.5} />
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl border border-line bg-card" />)}
        </div>
      ) : groups.length ? (
        <>
          {(() => {
            let idx = 0;
            return groups.map((g) => (
              <section key={g.key} id={`grp-${g.key}`} className="scroll-mt-2">
                <div className="sticky top-0 z-10 -mx-4 mb-3 mt-6 flex items-baseline gap-2 bg-ink px-4 py-2 lg:-mx-8 lg:px-8">
                  <span className="text-[20px] font-black text-[var(--acc)] brand-glow">{g.key}</span>
                  <span className="text-[11px] font-bold text-dim2">{g.items.length}</span>
                </div>
                <Deferred count={g.items.length}>
                  <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
                    {g.items.map((a) => <ArtistTile key={a.id} artist={a} gigging={giggingOnly || gigging?.has(a.id)} priority={idx++ < 8} />)}
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
        <p className="py-16 text-center font-semibold text-dim">No artists found.</p>
      )}
    </div>
  );
}
