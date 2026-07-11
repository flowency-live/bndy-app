"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Search } from "lucide-react";
import { useArtists, useUpcomingGigs } from "@/lib/hooks";
import { ArtistTile } from "./ArtistTile";
import { groupByInitial, ALPHA_INDEX } from "@/domain/grouping";
import { cn } from "@/lib/cn";

/** Renders children only when scrolled near the viewport. Off-screen letter
 *  groups cost zero React/DOM work — the placeholder holds estimated height
 *  so scrollbar + A-Z jumps stay stable. */
function Deferred({ count, children }: { count: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [show, setShow] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || show) return;
    const io = new IntersectionObserver(
      (es) => { if (es.some((e) => e.isIntersecting)) { setShow(true); io.disconnect(); } },
      { rootMargin: "900px 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [show]);
  // worst case 3 cols on mobile, ~124px per row incl. gap
  const est = Math.ceil(count / 3) * 124;
  return <div ref={ref} style={show ? undefined : { minHeight: est }}>{show ? children : null}</div>;
}

export function ArtistsBrowse() {
  const { data: artists = [], isLoading } = useArtists();
  const { data: gigs = [] } = useUpcomingGigs();
  const gigging = useMemo(() => new Set(gigs.map((g) => g.artistId).filter((x): x is string => !!x)), [gigs]);
  const [q, setQ] = useState("");

  const dq = useDeferredValue(q); // keystrokes stay responsive; filter runs at low priority
  const groups = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let list = [...artists].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
    if (query) list = list.filter((a) => a.name.toLowerCase().includes(query) || (a.genres ?? []).some((g) => g.toLowerCase().includes(query)));
    return groupByInitial(list, (a) => a.name);
  }, [artists, dq]);

  const present = useMemo(() => new Set(groups.map((g) => g.key)), [groups]);
  const jump = (k: string) => document.getElementById(`grp-${k}`)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-black tracking-tight lg:text-4xl">Artists</h1>
        <p className="mt-1 text-[13px] font-semibold text-dim lg:text-[15px]">
          {isLoading ? "Loading…" : `${artists.length} artists gigging on bndy`}
        </p>
      </header>

      <div className="relative mb-2 lg:max-w-md">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label="Search artists by name or genre"
          placeholder="Search artists or genres…"
          className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
        />
      </div>

      {isLoading ? (
        <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
          {Array.from({ length: 12 }).map((_, i) => <div key={i} className="aspect-square animate-pulse rounded-xl border border-line bg-card" />)}
        </div>
      ) : groups.length ? (
        <>
          {groups.map((g) => (
            <section key={g.key} id={`grp-${g.key}`} className="scroll-mt-2">
              <div className="sticky top-0 z-10 -mx-4 mb-3 mt-6 flex items-baseline gap-2 bg-ink px-4 py-2 lg:-mx-8 lg:px-8">
                <span className="text-[20px] font-black text-[var(--acc)] brand-glow">{g.key}</span>
                <span className="text-[11px] font-bold text-dim2">{g.items.length}</span>
              </div>
              <Deferred count={g.items.length}>
                <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 2xl:grid-cols-8">
                  {g.items.map((a) => <ArtistTile key={a.id} artist={a} gigging={gigging.has(a.id)} />)}
                </div>
              </Deferred>
            </section>
          ))}

          {/* A–Z jump rail */}
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
