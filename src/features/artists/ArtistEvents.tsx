"use client";

import { useMemo, useState } from "react";
import { supportingLabel } from "@/domain/lineup";
import { CalendarRange, ChevronDown, ChevronRight, MapPin, Mic } from "lucide-react";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles, formatDistance } from "@/domain/geo";
import { todayISO, formatTime, addDaysISO, DOW, MON, MON_FULL } from "@/domain/dates";
import { relativeLabel } from "@/domain/relative";
import { GigSheet } from "@/features/gigs/GigSheet";
import { TicketStub } from "@/components/TicketStub";
import { MiniMap } from "./MiniMap";
import { ArtistAvailability } from "./ArtistAvailability";
import { cn } from "@/lib/cn";
import type { Artist, AvailabilityDate, Gig } from "@/domain/types";
type View = "date" | "distance" | "map" | "availability";

export function ArtistEvents({ gigs, artistId, artist, availability = [] }: { gigs: Gig[]; artistId?: string; artist?: Artist | null; availability?: AvailabilityDate[] }) {
  const { location, located } = useGeolocation();
  const today = todayISO();
  const collapse90 = addDaysISO(today, 90);
  const hasAvailability = Boolean(artist?.publishAvailability && availability.length > 0);
  const [view, setView] = useState<View>("date");
  const [selected, setSelected] = useState<Gig | null>(null);
  const withDist = useMemo(() => gigs.map((g) => ({ g, dist: distanceMiles(location, g.location) })), [gigs, location]);
  const bookedDates = useMemo(() => new Set(gigs.filter((gig) => !gig.cancelled).map((gig) => gig.date)), [gigs]);

  const byMonth = useMemo(() => {
    const groups: { key: string; label: string; items: { g: Gig; dist: number }[]; firstDate: string }[] = [];
    const sorted = [...withDist].sort((a, b) => `${a.g.date}${a.g.startTime ?? ""}`.localeCompare(`${b.g.date}${b.g.startTime ?? ""}`));
    for (const x of sorted) {
      const [y, m] = x.g.date.split("-");
      const key = `${y}-${m}`;
      let grp = groups.find((g) => g.key === key);
      if (!grp) { grp = { key, label: `${MON_FULL[Number(m) - 1]} ${y}`, items: [], firstDate: x.g.date }; groups.push(grp); }
      grp.items.push(x);
    }
    return groups;
  }, [withDist]);

  const [expandedMonths, setExpandedMonths] = useState<Set<string>>(() => {
    const expanded = new Set<string>();
    for (const m of byMonth) if (m.firstDate < collapse90) expanded.add(m.key);
    return expanded;
  });
  const toggleMonth = (key: string) => setExpandedMonths((prev) => {
    const next = new Set(prev); if (next.has(key)) next.delete(key); else next.add(key); return next;
  });

  const bands = useMemo(() => {
    const sorted = [...withDist].sort((a, b) => a.dist - b.dist);
    const defs = [{ l: "Within 5 miles", lo: 0, hi: 5 }, { l: "5–10 miles", lo: 5, hi: 10 }, { l: "10–25 miles", lo: 10, hi: 25 }, { l: "25+ miles", lo: 25, hi: Infinity }];
    return defs.map((d) => ({ label: d.l, items: sorted.filter((x) => x.dist > d.lo && x.dist <= d.hi) })).filter((b) => b.items.length);
  }, [withDist]);

  if (!gigs.length && !hasAvailability) return <p className="mt-8 py-8 text-center font-semibold text-dim">No upcoming gigs listed.</p>;

  const views: View[] = gigs.length ? ["date", "distance", "map"] : [];
  if (hasAvailability) views.push("availability");
  const activeView = views.includes(view) ? view : views[0];

  return (
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="w-full rounded-full border border-line glass p-1 sm:w-auto" role="tablist" aria-label="Artist profile view">
          <div className={cn("grid w-full gap-1 sm:flex sm:w-max", views.length === 4 ? "grid-cols-4" : views.length === 3 ? "grid-cols-3" : views.length === 2 ? "grid-cols-2" : "grid-cols-1")}>
            {views.map((v) => (
              <button key={v} type="button" role="tab" aria-selected={activeView === v} onClick={() => setView(v)} className={cn("min-w-0 whitespace-nowrap rounded-full px-1 py-1.5 text-[9px] font-extrabold uppercase tracking-normal transition-colors sm:shrink-0 sm:px-3.5 sm:text-[11.5px] sm:tracking-wide", activeView === v ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
                {v === "date" ? "By date" : v === "distance" ? "By distance" : v === "map" ? "Map" : "Availability"}
              </button>
            ))}
          </div>
        </div>
        {activeView !== "availability" && gigs.length > 0 && <span className="text-[11px] font-bold uppercase tracking-wide text-dim2">from {located ? "your location" : "Stoke"}</span>}
      </div>

      {activeView === "availability" && artist ? (
        <ArtistAvailability artist={artist} availability={availability} busyDates={bookedDates} />
      ) : activeView === "map" ? (
        <MiniMap points={gigs.map((g) => ({ id: g.id, lat: g.location.lat, lng: g.location.lng }))} user={location} className="h-[320px] w-full overflow-hidden rounded-xl border border-line" />
      ) : activeView === "distance" ? (
        bands.map((b) => <div key={b.label} className="mb-6"><SectionHeader label={b.label} count={b.items.length} />{b.items.map((x) => <EventRow artistId={artistId} key={x.g.id} g={x.g} dist={x.dist} today={today} onClick={() => setSelected(x.g)} />)}</div>)
      ) : (
        <div className="space-y-1">
          {byMonth.map((m) => {
            const isExpanded = expandedMonths.has(m.key);
            const panelId = `artist-events-${m.key}`;
            return (
              <div key={m.key}>
                <button type="button" aria-expanded={isExpanded} aria-controls={panelId} onClick={() => toggleMonth(m.key)} className="flex w-full items-center justify-between rounded-md px-3 py-2" style={{ background: "var(--dayhead-bg)", color: "var(--dayhead-fg)" }}>
                  <span className="flex items-center gap-2">{isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}<span className="text-[12px] font-extrabold uppercase tracking-[1.5px]">{m.label}</span></span>
                  <span className="text-[11px] font-bold">{m.items.length} gig{m.items.length === 1 ? "" : "s"}</span>
                </button>
                {isExpanded && <div id={panelId} className="mt-1">{m.items.map((x) => <EventRow artistId={artistId} key={x.g.id} g={x.g} dist={x.dist} today={today} onClick={() => setSelected(x.g)} />)}</div>}
              </div>
            );
          })}
        </div>
      )}

      <GigSheet gig={selected} distance={selected ? distanceMiles(location, selected.location) : undefined} onClose={() => setSelected(null)} />
    </section>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return <div className="mb-1 flex items-center justify-between border-b border-line pb-1.5"><span className="text-[12px] font-extrabold uppercase tracking-[1.6px] text-[var(--acc)]">{label}</span><span className="text-[11px] font-bold uppercase tracking-wide text-dim2">{count} event{count === 1 ? "" : "s"}</span></div>;
}

function EventRow({ g, dist, today, artistId, onClick }: { g: Gig; dist: number; today: string; artistId?: string; onClick: () => void }) {
  const supporting = artistId ? supportingLabel(g, artistId) : "";
  const [, m, d] = g.date.split("-").map(Number);
  const dow = new Date(Date.UTC(Number(g.date.slice(0, 4)), m - 1, d)).getUTCDay();
  return (
    <button type="button" onClick={onClick} className={cn("group flex w-full items-center gap-4 border-l-2 border-orange/70 py-3 pl-4 pr-1 text-left transition hover:bg-white/[.03]", g.cancelled && "saturate-50")}>
      <div className="w-12 shrink-0 leading-none">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{DOW[dow]}</div>
        <div className="my-0.5 text-[22px] font-black">{d}</div>
        <div className="text-[10px] font-extrabold uppercase text-dim">{MON[m - 1]}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className={cn("truncate text-[15px] font-extrabold", g.cancelled && "line-through")}>{g.venueName}</span>
          {g.cancelled && <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-red-700 dark:text-red-300">Cancelled</span>}
          {g.festivalName && <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--acc)]" style={{ background: "color-mix(in srgb, var(--acc) 16%, transparent)" }} title={g.festivalName}><CalendarRange size={9} strokeWidth={2.75} /> Festival</span>}
          {g.isOpenMic && <span className="flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--acc2)]" style={{ background: "color-mix(in srgb, var(--acc2) 16%, transparent)" }}><Mic size={9} strokeWidth={2.75} /> Open mic</span>}
          <span className="rounded bg-card2 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{relativeLabel(g.date, today)}</span>
          {g.ticketed && <TicketStub price={g.ticketing?.price} />}
        </div>
        {supporting && <div className="mt-0.5 truncate text-[12.5px] font-bold text-dim2">{supporting}</div>}
        <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim"><MapPin size={12} />{g.venueCity ? `${g.venueCity} · ` : ""}{isFinite(dist) ? formatDistance(dist) : ""}{g.startTime ? ` · ${formatTime(g.startTime)}` : ""}</div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-dim2" />
    </button>
  );
}
