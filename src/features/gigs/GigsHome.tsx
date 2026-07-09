"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Check } from "lucide-react";
import { useUpcomingGigs, useArtistImageMap } from "@/lib/hooks";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles } from "@/domain/geo";
import { inWhenRange, todayISO, type WhenRange } from "@/domain/dates";
import { bucketGigs, dayHeading } from "@/domain/gigGrouping";
import { cn } from "@/lib/cn";
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
  const [selected, setSelected] = useState<Gig | null>(null);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(["later"]));

  // ignore card taps that fire immediately after the date sheet closes (mobile ghost-click)
  const shieldRef = useRef(0);
  const openGig = (g: Gig) => { if (Date.now() < shieldRef.current) return; setSelected(g); };

  const originLoc: LatLng = useMemo(() => origin.loc ?? geo, [origin.loc, geo]);
  const usingCurrent = origin.loc === null;

  // location + ticket + text filtered, ignoring the date/period filter — feeds the calendar's day dots
  // deferred: keystrokes/slider stay responsive; filtering runs at low priority
  const dq = useDeferredValue(q);
  const dRadius = useDeferredValue(radius);
  const eligible = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let out = gigs.filter((g) => g.date >= today);
    if (!showTicketed) out = out.filter((g) => !g.ticketed);
    if (query) out = out.filter((g) => `${g.artistName ?? ""} ${g.venueName} ${g.title}`.toLowerCase().includes(query));
    return out.map((g) => ({ gig: g, dist: distanceMiles(originLoc, g.location) })).filter((x) => x.dist <= dRadius);
  }, [gigs, showTicketed, dq, originLoc, dRadius, today]);

  const dayCounts = useMemo(() => { const m = new Map<string, number>(); for (const x of eligible) m.set(x.gig.date, (m.get(x.gig.date) ?? 0) + 1); return m; }, [eligible]);

  const filtered = useMemo(
    () => eligible.filter((x) => (dateSel ? x.gig.date >= dateSel.start && x.gig.date <= dateSel.end : inWhenRange(x.gig.date, when, today))),
    [eligible, dateSel, when, today],
  );

  const distById = useMemo(() => { const m = new Map<string, number>(); filtered.forEach((x) => m.set(x.gig.id, x.dist)); return m; }, [filtered]);
  const buckets = useMemo(() => bucketGigs(filtered.map((x) => x.gig), today), [filtered, today]);
  const total = filtered.length;
  const toggle = (k: string) => setCollapsed((prev) => { const n = new Set(prev); if (n.has(k)) n.delete(k); else n.add(k); return n; });

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-4">
        <h1 className="text-[26px] font-black tracking-tight lg:text-4xl">Gigs near you</h1>
        <p className="mt-1 text-[13px] font-semibold text-dim lg:text-[15px]">
          {isLoading ? "Finding gigs…" : `${total} gig${total === 1 ? "" : "s"} within ${radius} mi of ${origin.label}`}
          {usingCurrent && !located ? " · allow location for near-you results" : ""}
        </p>
      </header>

      <div className="sticky top-0 z-20 -mx-4 mb-3 space-y-2 bg-ink/85 px-4 py-2 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:py-0">
        <div className="relative lg:max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search gigs by artist or venue"
            placeholder="Search artists or venues…"
            className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <LocationField value={origin} onChange={setOrigin} />
          <div className="flex min-w-[180px] flex-1 items-center gap-2.5">
            <span className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-dim2">within</span>
            <input type="range" min={1} max={100} value={radius} onChange={(e) => setRadius(Number(e.target.value))} aria-label="Search radius in miles" className="h-1.5 flex-1 cursor-pointer" style={{ accentColor: "var(--acc)" }} />
            <span className="w-[46px] shrink-0 text-right text-[12.5px] font-extrabold tnum">{radius} mi</span>
          </div>
        </div>

        <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {WHENS.map((w) => (<Chip key={w.k} on={!dateSel && when === w.k} onClick={() => { setWhen(w.k); setDateSel(null); }}>{w.l}</Chip>))}
          <GigDatePicker value={dateSel} onChange={setDateSel} today={today} dayCounts={dayCounts} onClosed={() => { shieldRef.current = Date.now() + 500; }} />
          <button
            onClick={() => setShowTicketed((v) => !v)}
            aria-pressed={showTicketed}
            style={showTicketed ? { borderColor: "color-mix(in srgb, var(--acc2) 60%, transparent)", background: "color-mix(in srgb, var(--acc2) 22%, var(--glass))" } : undefined}
            className={cn("ml-auto flex shrink-0 items-center gap-2 rounded-2xl border border-line glass px-3.5 py-2 text-[12.5px] font-extrabold transition-colors", showTicketed ? "text-white" : "text-dim")}
          >
            <span className={cn("flex h-[15px] w-[15px] items-center justify-center rounded-[5px] border", showTicketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
              {showTicketed && <Check size={11} strokeWidth={3.5} />}
            </span>
            Show ticketed
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-line bg-card" />)}
        </div>
      ) : total ? (
        buckets.map((b) => {
          const open = dateSel ? true : !collapsed.has(b.key);
          return (
            <div key={b.key} className="mt-6">
              <button onClick={() => toggle(b.key)} className="flex w-full items-center justify-between border-b border-line pb-1.5">
                <span className="text-[13px] font-extrabold uppercase tracking-[1.5px] text-[var(--acc)]">{b.label}</span>
                <span className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wide text-dim2">
                  {b.count} gig{b.count === 1 ? "" : "s"}
                  <ChevronDown size={15} className={cn("transition-transform", open && "rotate-180")} />
                </span>
              </button>
              {open && b.days.map((day) => (
                <div key={day.date} className="mt-4">
                  <div className="mb-2 text-[12px] font-extrabold uppercase tracking-wide text-dim">
                    {dayHeading(day.date, today)} <span className="text-dim2">· {day.gigs.length}</span>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {day.gigs.map((g) => (
                      <GigCard key={g.id} gig={g} imageUrl={g.artistId ? imgMap.get(g.artistId) : undefined} distance={distById.get(g.id)} tonight={g.date === today} onClick={() => openGig(g)} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

function Chip({ on, onClick, accent, children }: { on: boolean; onClick: () => void; accent?: "orange" | "violet"; children: React.ReactNode }) {
  const a = accent === "violet" ? "var(--acc2)" : "var(--acc)";
  return (
    <button
      onClick={onClick}
      style={on ? { borderColor: `color-mix(in srgb, ${a} 60%, transparent)`, background: `color-mix(in srgb, ${a} 22%, var(--glass))` } : undefined}
      className={cn("shrink-0 rounded-2xl border border-line glass px-3.5 py-2 text-[12.5px] font-extrabold transition-colors", on ? "text-white" : "text-dim")}
    >
      {children}
    </button>
  );
}
