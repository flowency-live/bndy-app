"use client";

import { useDeferredValue, useMemo, useRef, useState } from "react";
import { Search, ChevronDown, Heart, Mic, Ticket } from "lucide-react";
import { useUpcomingGigs, useArtistImageMap } from "@/lib/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles } from "@/domain/geo";
import { DOW, MON, inWhenRange, isTonight, parseISO, todayISO, type WhenRange } from "@/domain/dates";
import { bucketGigs, dayHeading } from "@/domain/gigGrouping";
import { cn } from "@/lib/cn";
import { Deferred } from "@/components/DeferredSection";
import { GigCard } from "./GigCard";
import { GigSheet } from "./GigSheet";
import { blockFestivalGigs } from "@/domain/festivalBlocks";
import { FestivalBlockRow } from "@/features/festivals/FestivalBlockRow";
import { LocationField, type OriginChoice } from "./LocationField";
import { GigDatePicker, gigDateLabel, type DateSel } from "./GigDatePicker";
import type { Gig, LatLng } from "@/domain/types";

const WHENS: { k: WhenRange; l: string }[] = [
  { k: "all", l: "Anytime" },
  { k: "tonight", l: "Tonight" },
  { k: "weekend", l: "Weekend" },
  { k: "week", l: "7 days" },
];

const FACET_COLOURS = {
  favourites: { accent: "#ef4444", onText: "#ffffff" },
  openMic: { accent: "#facc15", onText: "#171717" },
  tickets: { accent: "#22c55e", onText: "#052e16" },
} as const;

export function GigsHome() {
  const { data: gigs = [], isLoading } = useUpcomingGigs();
  const { location: geo, located } = useGeolocation();
  const imgMap = useArtistImageMap();
  const today = todayISO();

  const [origin, setOrigin] = useState<OriginChoice>({ loc: null, label: "Current location" });
  const [radius, setRadius] = useState(5);
  const [when, setWhen] = useState<WhenRange>("all");
  const [dateSel, setDateSel] = useState<DateSel | null>(null);
  const [whenMenuOpen, setWhenMenuOpen] = useState(false);
  const [ticketOnly, setTicketOnly] = useState(false);
  const [openMicOnly, setOpenMicOnly] = useState(false);
  const [q, setQ] = useState("");
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists, venueSet: favVenues } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const favActive = favOnly && isAuthenticated;
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
    if (ticketOnly) out = out.filter((g) => g.ticketed);
    if (openMicOnly) out = out.filter((g) => g.isOpenMic);
    if (favActive) out = out.filter((g) => (g.artistId && favArtists.has(g.artistId)) || favVenues.has(g.venueId));
    if (query) out = out.filter((g) => `${g.artistName ?? ""} ${g.venueName} ${g.title} ${g.festivalName ?? ""}`.toLowerCase().includes(query));
    return out.map((g) => ({ gig: g, dist: distanceMiles(originLoc, g.location) })).filter((x) => x.dist <= dRadius);
  }, [gigs, ticketOnly, openMicOnly, favActive, favArtists, favVenues, dq, originLoc, dRadius, today]);

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
  const mobileWhenLabel = dateSel ? gigDateLabel(dateSel, today) : (WHENS.find((w) => w.k === when)?.l ?? "Anytime");
  const toggle = (k: string) => setCollapsed((prev) => {
    const n = new Set(prev);
    if (n.has(k)) n.delete(k); else n.add(k);
    return n;
  });

  const selectWhen = (next: WhenRange) => {
    setWhen(next);
    setDateSel(null);
    setWhenMenuOpen(false);
  };

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
      <div className="mb-6 lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:items-end lg:gap-x-8 lg:gap-y-4 lg:mb-8">
        <header className="mb-5 hidden lg:block lg:mb-0">
          <h1 className="font-disp text-[38px] font-black leading-none tracking-tight">Gigs near you</h1>
          <p className="mt-1.5 text-[13px] font-semibold text-dim">
            {isLoading ? "Finding gigs…" : `${total} gig${total === 1 ? "" : "s"} within ${radius} mi of ${origin.label}`}
            {usingCurrent && !located ? " · allow location for near-you results" : ""}
          </p>
        </header>

        <div className="mb-3 flex items-stretch gap-2 lg:hidden">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search gigs by artist, venue or festival"
            placeholder="Search gigs, venues, festivals…"
            className="min-w-0 flex-1 rounded-[var(--rad)] border border-line glass px-4 py-3 text-left text-[14px] font-semibold outline-none transition-colors placeholder:text-left placeholder:text-dim focus:border-[var(--acc)]"
          />
          <div
            className="flex w-[76px] shrink-0 flex-col items-center justify-center rounded-[var(--rad)] border border-line px-2 py-2 text-center"
            style={{ background: "color-mix(in srgb, var(--acc) 10%, var(--glass))", borderColor: "color-mix(in srgb, var(--acc) 30%, var(--line))" }}
          >
            <div className="tnum text-[18px] font-black leading-none text-txt">{isLoading ? "…" : total}</div>
            <div className="font-meta mt-1 text-[8px] font-extrabold uppercase tracking-[1.5px] text-[var(--acc)]">Gigs</div>
          </div>
        </div>

        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(260px,1fr)_auto_minmax(230px,.72fr)] lg:items-center">
          <div className="relative hidden lg:block">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              aria-label="Search gigs by artist, venue or festival"
              placeholder="Search artists, venues or festivals…"
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

        <div className="sticky top-0 z-20 -mx-4 mt-3 border-y border-line bg-ink/92 px-4 py-2.5 backdrop-blur lg:static lg:col-span-2 lg:mx-0 lg:mt-0 lg:border-x-0 lg:border-t-0 lg:bg-transparent lg:px-0 lg:pb-3 lg:pt-0 lg:backdrop-blur-none">
          <div className="relative lg:hidden">
            <div className="grid grid-flow-col auto-cols-fr gap-1.5">
              <button
                onClick={() => setWhenMenuOpen((v) => !v)}
                aria-expanded={whenMenuOpen}
                aria-haspopup="menu"
                style={{ borderColor: "color-mix(in srgb, var(--acc) 55%, transparent)", background: "color-mix(in srgb, var(--acc) 18%, var(--glass))" }}
                className="flex min-w-0 items-center justify-center gap-1 rounded-[var(--rad)] border px-1.5 py-2.5 text-[10.5px] font-extrabold text-txt transition-colors"
              >
                <span className="min-w-0 truncate">{mobileWhenLabel}</span>
                <ChevronDown size={13} className={cn("shrink-0 transition-transform", whenMenuOpen && "rotate-180")} />
              </button>

              {isAuthenticated && (
                <FacetToggle
                  compact
                  on={favOnly}
                  onClick={() => setFavOnly((v) => !v)}
                  label="Favourites"
                  {...FACET_COLOURS.favourites}
                  icon={<Heart size={13} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.4} />}
                />
              )}

              <FacetToggle
                compact
                on={openMicOnly}
                onClick={() => setOpenMicOnly((v) => !v)}
                label="Open Mic"
                {...FACET_COLOURS.openMic}
                icon={<Mic size={13} strokeWidth={2.4} />}
              />

              <FacetToggle
                compact
                on={ticketOnly}
                onClick={() => setTicketOnly((v) => !v)}
                label="Tickets"
                {...FACET_COLOURS.tickets}
                icon={<Ticket size={13} strokeWidth={2.4} />}
              />
            </div>

            {whenMenuOpen && (
              <>
                <button aria-label="Close date filter" onClick={() => setWhenMenuOpen(false)} className="fixed inset-0 z-20 cursor-default" />
                <div role="menu" className="absolute left-0 top-[calc(100%+8px)] z-30 w-[min(270px,calc(100vw-32px))] rounded-[var(--rad-lg)] border border-line bg-card p-1.5 shadow-[var(--shadow)]">
                  <div className="px-3 pb-1.5 pt-2 font-meta text-[9px] font-extrabold uppercase tracking-[1.7px] text-dim2">When?</div>
                  {WHENS.map((w) => {
                    const active = !dateSel && when === w.k;
                    return (
                      <button
                        key={w.k}
                        role="menuitemradio"
                        aria-checked={active}
                        onClick={() => selectWhen(w.k)}
                        className={cn("flex w-full items-center gap-3 rounded-[var(--rad)] px-3 py-2.5 text-left text-[12px] font-extrabold transition-colors hover:bg-card2", active ? "text-txt" : "text-dim")}
                      >
                        <span className={cn("h-2 w-2 shrink-0 rounded-full border border-line-hi", active && "border-[var(--acc)] bg-[var(--acc)]")} />
                        {w.l}
                      </button>
                    );
                  })}
                  <div className="my-1 border-t border-line" />
                  <GigDatePicker
                    variant="menu"
                    value={dateSel}
                    onChange={setDateSel}
                    today={today}
                    dayCounts={dayCounts}
                    onClosed={() => { shieldRef.current = Date.now() + 500; setWhenMenuOpen(false); }}
                  />
                </div>
              </>
            )}
          </div>

          <div className="hidden gap-2 lg:flex lg:flex-wrap">
            {WHENS.map((w) => (
              <Chip key={w.k} on={!dateSel && when === w.k} onClick={() => selectWhen(w.k)}>{w.l}</Chip>
            ))}
            <GigDatePicker value={dateSel} onChange={setDateSel} today={today} dayCounts={dayCounts} onClosed={() => { shieldRef.current = Date.now() + 500; }} />
            {isAuthenticated && (
              <FacetToggle
                on={favOnly}
                onClick={() => setFavOnly((v) => !v)}
                label="Favourites"
                {...FACET_COLOURS.favourites}
                icon={<Heart size={14} fill={favOnly ? "currentColor" : "none"} strokeWidth={2.5} />}
              />
            )}
            <FacetToggle
              on={openMicOnly}
              onClick={() => setOpenMicOnly((v) => !v)}
              label="Open Mic"
              {...FACET_COLOURS.openMic}
              icon={<Mic size={14} strokeWidth={2.5} />}
            />
            <FacetToggle
              className="ml-auto"
              on={ticketOnly}
              onClick={() => setTicketOnly((v) => !v)}
              label="Tickets"
              {...FACET_COLOURS.tickets}
              icon={<Ticket size={14} strokeWidth={2.5} />}
            />
          </div>
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
                          {/* Festival bills (several acts, one venue, one shared
                              time) collapse to one signpost row - six 4pm rows
                              from one bill is noise, not a listing. */}
                          {blockFestivalGigs(day.gigs).map((item) =>
                            item.kind === "gig" ? (
                              <GigCard
                                key={item.gig.id}
                                gig={item.gig}
                                imageUrl={item.gig.artistId ? imgMap.get(item.gig.artistId) : undefined}
                                distance={distById.get(item.gig.id)}
                                tonight={isTonight(item.gig.date, item.gig.startTime, today)}
                                onClick={() => openGig(item.gig)}
                              />
                            ) : (
                              <FestivalBlockRow key={`${item.festivalId}-${item.venueId}-${item.date}`} block={item} showVenue className="px-2 lg:px-0" />
                            ),
                          )}
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

function FacetToggle({ on, onClick, label, icon, accent, onText, compact, className }: {
  on: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  accent: string;
  onText: string;
  compact?: boolean;
  className?: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      aria-label={`${label} only`}
      style={on
        ? {
            borderColor: accent,
            background: accent,
            color: onText,
            boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 28%, transparent), 0 0 16px color-mix(in srgb, ${accent} 18%, transparent)`,
          }
        : {
            borderColor: `color-mix(in srgb, ${accent} 48%, var(--line))`,
            background: `color-mix(in srgb, ${accent} 7%, var(--glass))`,
          }}
      className={cn(
        "flex min-w-0 shrink-0 items-center border font-extrabold transition-[background-color,border-color,box-shadow,transform] active:scale-[.98]",
        compact ? "justify-center gap-1 rounded-[var(--rad)] px-1 py-2.5 text-[9.5px]" : "gap-2 rounded-[var(--rad)] px-3.5 py-2 text-[12px]",
        on ? "" : "text-txt",
        className,
      )}
    >
      <span className="shrink-0" style={{ color: on ? onText : accent }}>{icon}</span>
      <span className="min-w-0 truncate whitespace-nowrap">{label}</span>
    </button>
  );
}