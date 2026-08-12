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

  // Ignore card taps that fire immediately after the date sheet closes (mobile ghost-click).
  const shieldRef = useRef(0);
  const openGig = (g: Gig) => { if (Date.now() < shieldRef.current) return; setSelected(g); };

  const originLoc: LatLng = useMemo(() => origin.loc ?? geo, [origin.loc, geo]);
  const usingCurrent = origin.loc === null;

  // Location + ticket + text filtered, ignoring the date/period filter — feeds the calendar's day dots.
  // Deferred values keep typing and radius changes responsive while the list is large.
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
      <header className="mb-5 lg:mb-6">
        <h1 className="text-[28px] font-black tracking-tight lg:text-4xl">Gigs near you</h1>
        <p className="mt-1 text-[13px] font-semibold text-dim lg:text-[15px]">
          {isLoading ? "Finding gigs…" : `${total} gig${total === 1 ? "" : "s"} within ${radius} mi of ${origin.label}`}
          {usingCurrent && !located ? " · allow location for near-you results" : ""}
        </p>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mb-5 space-y-2.5 border-y border-line bg-ink/90 px-4 py-3 backdrop-blur lg:static lg:mx-0 lg:mb-7 lg:rounded-[var(--rad-lg)] lg:border lg:bg-card lg:p-3.5">
        <div className="grid gap-2.5 lg:grid-cols-[minmax(300px,440px)_auto_minmax(260px,1fr)] lg:items-center">
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search gigs by artist or venue"
              placeholder="Search artists or venues…"
              className="w-full rounded-[var(--rad)] border border-line glass px-10 py-3 text-[14px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]"
            />
          </div>

          <LocationField value={origin} onChange={setOrigin} />

          <div className="flex min-w-[180px] items-center gap-2.5 lg:px-1">
            <span className="shrink-0 text-[10px] font-bold uppercase tracking-[1.2px] text-dim2">within</span>
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
            <span className="w-[46px] shrink-0 text-right text-[12.5px] font-extrabold tnum">{radius} mi</span>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto border-t border-line px-4 pt-2.5 lg:mx-0 lg:flex-wrap lg:px-0">
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
        <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card">
          {Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse border-b border-line bg-card last:border-b-0" />)}
        </div>
      ) : total ? (
        buckets.map((b) => {
          const open = dateSel ? true : !collapsed.has(b.key);
          return (
            <section key={b.key} className="mt-7 first:mt-0 lg:mt-9">
              <button onClick={() => toggle(b.key)} className="flex w-full items-center justify-between border-b border-line pb-2">
                <span className="text-[12px] font-extrabold uppercase tracking-[1.8px] text-[var(--acc)]">{b.label}</span>
                <span className="flex items-center gap-2 text-[10.5px] font-bold uppercase tracking-wide text-dim2">
                  {b.count} gig{b.count === 1 ? "" : "s"}
                  <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
                </span>
              </button>

              {open && b.days.map((day) => {
                const parts = dateParts(day.date, today);
                return (
                  <div key={day.date} className="mt-4 lg:grid lg:grid-cols-[104px_minmax(0,1fr)] lg:gap-5 lg:mt-5">
                    <aside className="hidden border-r border-line pr-5 pt-2 text-right lg:block">
                      <div className="text-[10px] font-extrabold uppercase tracking-[1.7px] text-[var(--acc)]">{parts.weekday}</div>
                      <div className="tnum mt-1 text-[44px] font-black leading-[0.88] tracking-[-2px] text-txt">{parts.day}</div>
                      <div className="mt-2 text-[10px] font-bold uppercase tracking-[1.5px] text-dim">{parts.month}</div>
                      <div className="mt-2 text-[9.5px] font-bold uppercase tracking-wide text-dim2">{day.gigs.length} gig{day.gigs.length === 1 ? "" : "s"}</div>
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

                      <Deferred count={day.gigs.length} heightPerItem={92} itemsPerRow={1}>
                        <div className="overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card" style={{ borderWidth: "var(--bw, 1px)" }}>
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
