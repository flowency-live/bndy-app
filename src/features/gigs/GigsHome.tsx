"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check, Heart, Mic, MicOff } from "lucide-react";
import { useUpcomingGigs, useArtistImageMap } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useOpenMicPref } from "@/lib/openMicPref";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles } from "@/domain/geo";
import { DOW, MON, inWhenRange, isTonight, parseISO, todayISO, type WhenRange } from "@/domain/dates";
import { bucketGigs, dayHeading } from "@/domain/gigGrouping";
import { cn } from "@/lib/cn";
import { Deferred } from "@/components/DeferredSection";
import { GigCard } from "./GigCard";
import { GigSheet } from "./GigSheet";
import { LocationField, type OriginChoice } from "./LocationField";
import { GigDatePicker, type DateSel } from "./GigDatePicker";
import type { Gig, LatLng } from "@/domain/types";

const WHENS: { k: WhenRange; l: string }[] = [
  { k: "all", l: "Anytime" },
  { k: "tonight", l: "Tonight" },
  { k: "weekend", l: "Weekend" },
  { k: "week", l: "7 days" },
];

export function GigsHome() {
  const { data: gigs = [], isLoading } = useUpcomingGigs();
  const { location: geo, located } = useGeolocation();
  const imgMap = useArtistImageMap();
  const today = todayISO();

  const [origin, setOrigin] = useState<OriginChoice>({ loc: null, label: "Current location" });
  const [radius, setRadius] = useState(5);
  const [when, setWhen] = useState<WhenRange>("all");
  const [dateSel, setDateSel] = useState<DateSel | null>(null);
  const [showTicketed, setShowTicketed] = useState(false);
  const [q, setQ] = useState("");
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists, venueSet: favVenues } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;
  const { showOpenMics, toggleOpenMics } = useOpenMicPref();
  const [selected, setSelected] = useState<Gig | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["later"]));

  const shieldRef = useRef(0);
  const openGig = (g: Gig) => { if (Date.now() < shieldRef.current) return; setSelected(g); };

  const originLoc: LatLng = useMemo(() => origin.loc ?? geo, [origin.loc, geo]);
  const usingCurrent = origin.loc === null;

  const dq = useDeferredValue(q);
  const dRadius = useDeferredValue(radius);
  const eligible = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let out = gigs.filter((g) => g.date >= today);
    if (!showTicketed) out = out.filter((g) => !g.ticketed);
    if (!showOpenMics) out = out.filter((g) => !g.isOpenMic);
    if (favActive) out = out.filter((g) => (g.artistId && favArtists.has(g.artistId)) || favVenues.has(g.venueId));
    if (query) out = out.filter((g) => `${g.artistName ?? ""} ${g.venueName} ${g.title}`.toLowerCase().includes(query));
    return out.map((g) => ({ gig: g, dist: distanceMiles(originLoc, g.location) })).filter((x) => x.dist <= dRadius);
  }, [gigs, showTicketed, showOpenMics, favActive, favArtists, favVenues, dq, originLoc, dRadius, today]);

  const dayCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const x of eligible) m.set(x.gig.date, (m.get(x.gig.date) ?? 0) + 1);
    return m;
  }, [eligible]);

  const filtered = useMemo(
    () => eligible.filter((x) => (dateSel ? x.gig.date >= dateSel.start && x.gig.date <= dateSel.end : inWhenRange(x.gig.date, when, today))),
    [eligible, dateSel, when, today],
  );

  const distById = useMemo(() => {
    const m = new Map<string, number>();
    filtered.forEach((x) => m.set(x.gig.id, x.dist));
    return m;
  }, [filtered]);
  const buckets = useMemo(() => bucketGigs(filtered.map((x) => x.gig), today), [filtered, today]);
  const total = filtered.length;
  const toggle = (k: string) => setCollapsed((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mb-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-end lg:gap-x-8 lg:gap-y-4 lg:mb-8">
        <header className="mb-5 lg:mb-0">
          <h1 className="font-disp text-[29px] font-black tracking-tight lg:text-[38px] lg:leading-none">Gigs near you</h1>
          <p className="mt-1.5 text-[12.5px] font-semibold text-dim lg:text-[13px]">
            {isLoading ? "Finding gigs…" : `${total} gig${total === 1 ? "" : "s"} within ${radius} mi of ${origin.label}`}
            {usingCurrent && !located ? " · allow location for near-you results" : ""}
          </p>
        </header>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_auto_minmax(230px,.72fr)] lg:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search gigs by artist or venue"
              placeholder="Search artists or venues…"
              className="w-full rounded-[var(--rad)] border border-line glass px-10 py-3 text-[14px] font-semibold outline-none transition-colors placeholder:text-dim focus:border-[var(--acc)]"
            />
          </div>

          <LocationField value={origin} onChange={setOrigin} />

          <div className="flex min-w-[180px] items-center gap-2.5 sm:col-span-2 lg:col-span-1 lg:px-1">
            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[1.3px] text-dim2">within</span>
            <input
              type="range"
              min={1}
              max={100}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              aria-label="Search radius in miles"
              className="h-1.5 flex-1 cursor-pointer"
              style={{ accentColor: "var(--acc)" }}
            />
            <span className="w-[46px] shrink-0 text-right text-[12px] font-extrabold tnum">{radius} mi</span>
          </div>
        </div>

        <div className="no-scrollbar sticky top-0 z-20 -mx-4 mt-3 flex gap-2 overflow-x-auto border-y border-line bg-ink/92 px-4 py-2.5 backdrop-blur lg:static lg:col-span-2 lg:mx-0 lg:mt-0 lg:flex-wrap lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0 lg:backdrop-blur-none">
          {WHENS.map((w) => (
            <Chip key={w.k} on={!dateSel && when === w.k} onClick={() => { setWhen(w.k); setDateSel(null); }}>{w.l}</Chip>
          ))}
          <GigDatePicker value={dateSel} onChange={setDateSel} today={today} dayCounts={dayCounts} onClosed={() => { shieldRef.current = Date.now() + 500; }} />
          {isAuthenticated && (
            <button
              onClick={() => setFavOnly((v) => !v)}
              aria-pressed={favOnly}
              style={favOnly ? { borderColor: "color-mix(in srgb, var(--acc) 60%, transparent)", background: "color-mix(in srgb, var(--acc) 22%, var(--glass))" } : undefined}
              className={cn("flex shrink-0 items-center gap-2 rounded-[var(--rad)] border border-line glass px-3.5 py-2 text-[12px] font-extrabold transition-colors", favOnly ? "text-txt" : "text-dim")}
            >
              <Heart size={14} fill={favOnly ? "var(--acc)" : "none"} strokeWidth={2.5} className={favOnly ? "text-[var(--acc)]" : ""} />
              Favourites
            </button>
          )}
          <button
            onClick={toggleOpenMics}
            aria-pressed={showOpenMics}
            title={showOpenMics ? "Open mics shown. Tap to hide them." : "Open mics hidden. Tap to show them."}
            style={showOpenMics ? { borderColor: "color-mix(in srgb, var(--acc2) 60%, transparent)", background: "color-mix(in srgb, var(--acc2) 22%, var(--glass))" } : undefined}
            className={cn("flex shrink-0 items-center gap-2 rounded-[var(--rad)] border border-line glass px-3.5 py-2 text-[12px] font-extrabold transition-colors", showOpenMics ? "text-txt" : "text-dim")}
          >
            {showOpenMics
              ? <Mic size={14} strokeWidth={2.5} className="text-[var(--acc2)]" />
              : <MicOff size={14} strokeWidth={2.5} />}
            Open mics
          </button>
          <button
            onClick={() => setShowTicketed((v) => !v)}
            aria-pressed={showTicketed}
            style={showTicketed ? { borderColor: "color-mix(in srgb, var(--acc2) 60%, transparent)", background: "color-mix(in srgb, var(--acc2) 22%, var(--glass))" } : undefined}
            className={cn("ml-auto flex shrink-0 items-center gap-2 rounded-[var(--rad)] border border-line glass px-3.5 py-2 text-[12px] font-extrabold transition-colors", showTicketed ? "text-txt" : "text-dim")}
          >
            <span className={cn("flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border", showTicketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
              {showTicketed && <Check size={11} strokeWidth={3.5} />}
            </span>
            Show ticketed
          </button>
        </div>
      </div>

      {isLoading ? (
        <div>
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-[100px] animate-pulse border-b border-line bg-card/40" />)}
        </div>
      ) : total ? (
        buckets.map((b) => {
          const open = dateSel ? true : !collapsed.has(b.key);
          return (
            <section key={b.key} className="mt-7 first:mt-0 lg:mt-10">
              <button onClick={() => toggle(b.key)} className="group flex w-full items-center gap-3 pb-2 text-left">
                <span className="font-meta text-[10.5px] font-extrabold uppercase tracking-[2px] text-[var(--acc)] lg:text-[11px]">{b.label}</span>
                <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--line)_70%,transparent)]" />
                <span className="flex items-center gap-2 font-meta text-[9.5px] font-bold uppercase tracking-wide text-dim2">
                  {b.count} gig{b.count === 1 ? "" : "s"}
                  <ChevronDown size={14} className={cn("transition-transform", open && "rotate-180")} />
                </span>
              </button>

              {open && b.days.map((day) => {
                const parts = dateParts(day.date, today);
                return (
                  <div key={day.date} className="mt-4 lg:grid lg:grid-cols-[124px_minmax(0,1fr)] lg:gap-7 lg:mt-6">
                    <aside className="relative hidden pr-7 text-right lg:block">
                      <div className="sticky top-6 pt-1">
                        <div className="font-meta text-[9px] font-extrabold uppercase tracking-[2px] text-[var(--acc)]">{parts.weekday}</div>
                        <div className="tnum font-disp mt-1 text-[52px] font-black leading-[0.84] tracking-[-2.5px] text-txt">{parts.day}</div>
                        <div className="font-meta mt-2.5 text-[9px] font-bold uppercase tracking-[1.8px] text-dim">{parts.month}</div>
                        <div className="font-meta mt-2 text-[8.5px] font-bold uppercase tracking-[1px] text-dim2">{day.gigs.length} gig{day.gigs.length === 1 ? "" : "s"}</div>
                      </div>
                      <span className="absolute bottom-0 right-0 top-0 w-px bg-[color-mix(in_srgb,var(--line)_65%,transparent)]" aria-hidden />
                    </aside>

                    <div className="min-w-0">
                      <div
                        className="mb-2 flex items-baseline justify-between rounded-[var(--rad)] px-3 py-[7px] lg:hidden"
                        style={day.date === today
                          ? { background: "var(--dayhead-hot-bg)", color: "var(--dayhead-hot-fg)" }
                          : { background: "var(--dayhead-bg)", color: "var(--dayhead-fg)" }}
                      >
                        <span className="text-[11px] font-extrabold uppercase tracking-[1.5px]">{dayHeading(day.date, today)}</span>
                        <span className="text-[10px] font-bold tnum">{day.gigs.length} gig{day.gigs.length === 1 ? "" : "s"}</span>
                      </div>

                      <Deferred count={day.gigs.length} heightPerItem={100} itemsPerRow={1}>
                        <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card lg:overflow-visible lg:rounded-none lg:border-0 lg:bg-transparent">
                          {day.gigs.map((g) => (
                            <GigCard
                              key={g.id}
                              gig={g}
                              imageUrl={g.artistId ? imgMap.get(g.artistId) : undefined}
                              distance={distById.get(g.id)}
                              tonight={isTonight(g.date, g.startTime, today)}
                              onClick={() => openGig(g)}
                            />
                          ))}
                        </div>
                      </Deferred>
                    </div>
                  </div>
                );
              })}
            </section>
          );
        })
      ) : (
        <div className="py-16 text-center">
          <p className="font-semibold text-dim">No gigs within {radius} mi of {origin.label}.</p>
          <p className="mt-1 text-[13px] text-dim2">Drag the radius wider, pick another location, or change the dates.</p>
        </div>
      )}

      <GigSheet gig={selected} distance={selected ? distanceMiles(originLoc, selected.location) : undefined} onClose={() => setSelected(null)} />
    </div>
  );
}

function dateParts(iso: string, today: string) {
  const d = parseISO(iso);
  return {
    weekday: iso === today ? "Today" : DOW[d.getDay()],
    day: String(d.getDate()).padStart(2, "0"),
    month: MON[d.getMonth()],
  };
}

function Chip({ on, onClick, accent, children }: { on: boolean; onClick: () => void; accent?: "orange" | "violet"; children: React.ReactNode }) {
  const a = accent === "violet" ? "var(--acc2)" : "var(--acc)";
  return (
    <button
      onClick={onClick}
      style={on ? { borderColor: `color-mix(in srgb, ${a} 60%, transparent)`, background: `color-mix(in srgb, ${a} 22%, var(--glass))` } : undefined}
      className={cn("shrink-0 rounded-[var(--rad)] border border-line glass px-3.5 py-2 text-[12px] font-extrabold transition-colors", on ? "text-txt" : "text-dim")}
    >
      {children}
    </button>
  );
}
