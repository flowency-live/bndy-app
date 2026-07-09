"use client";

import { useMemo, useState } from "react";
import { ChevronRight, MapPin } from "lucide-react";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles, formatDistance } from "@/domain/geo";
import { todayISO, formatTime } from "@/domain/dates";
import { relativeLabel } from "@/domain/relative";
import { GigSheet } from "@/features/gigs/GigSheet";
import { MiniMap } from "./MiniMap";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
type View = "date" | "distance" | "map";

export function ArtistEvents({ gigs }: { gigs: Gig[] }) {
  const { location, located } = useGeolocation();
  const today = todayISO();
  const [view, setView] = useState<View>("date");
  const [selected, setSelected] = useState<Gig | null>(null);

  const withDist = useMemo(() => gigs.map((g) => ({ g, dist: distanceMiles(location, g.location) })), [gigs, location]);
  const byDate = useMemo(() => [...withDist].sort((a, b) => `${a.g.date}${a.g.startTime ?? ""}`.localeCompare(`${b.g.date}${b.g.startTime ?? ""}`)), [withDist]);
  const bands = useMemo(() => {
    const sorted = [...withDist].sort((a, b) => a.dist - b.dist);
    const defs = [{ l: "Within 5 miles", lo: 0, hi: 5 }, { l: "5–10 miles", lo: 5, hi: 10 }, { l: "10–25 miles", lo: 10, hi: 25 }, { l: "25+ miles", lo: 25, hi: Infinity }];
    return defs.map((d) => ({ label: d.l, items: sorted.filter((x) => x.dist > d.lo && x.dist <= d.hi) })).filter((b) => b.items.length);
  }, [withDist]);

  if (!gigs.length) {
    return <p className="mt-8 py-8 text-center font-semibold text-dim">No upcoming gigs listed.</p>;
  }

  return (
    <section className="mt-7">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1 rounded-full border border-line glass p-1">
          {(["date", "distance", "map"] as View[]).map((v) => (
            <button key={v} onClick={() => setView(v)}
              className={cn("rounded-full px-3.5 py-1.5 text-[11.5px] font-extrabold uppercase tracking-wide transition-colors", view === v ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
              {v === "date" ? "By date" : v === "distance" ? "By distance" : "Map"}
            </button>
          ))}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide text-dim2">from {located ? "your location" : "Stoke"}</span>
      </div>

      {view === "map" ? (
        <MiniMap
          points={gigs.map((g) => ({ id: g.id, lat: g.location.lat, lng: g.location.lng }))}
          user={location}
          className="h-[320px] w-full overflow-hidden rounded-xl border border-line"
        />
      ) : view === "distance" ? (
        bands.map((b) => (
          <div key={b.label} className="mb-6">
            <SectionHeader label={b.label} count={b.items.length} />
            {b.items.map((x) => <EventRow key={x.g.id} g={x.g} dist={x.dist} today={today} onClick={() => setSelected(x.g)} />)}
          </div>
        ))
      ) : (
        <div>
          <SectionHeader label="Upcoming" count={byDate.length} />
          {byDate.map((x) => <EventRow key={x.g.id} g={x.g} dist={x.dist} today={today} onClick={() => setSelected(x.g)} />)}
        </div>
      )}

      <GigSheet gig={selected} distance={selected ? distanceMiles(location, selected.location) : undefined} onClose={() => setSelected(null)} />
    </section>
  );
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="mb-1 flex items-center justify-between border-b border-line pb-1.5">
      <span className="text-[12px] font-extrabold uppercase tracking-[1.6px] text-[var(--acc)]">{label}</span>
      <span className="text-[11px] font-bold uppercase tracking-wide text-dim2">{count} event{count === 1 ? "" : "s"}</span>
    </div>
  );
}

function EventRow({ g, dist, today, onClick }: { g: Gig; dist: number; today: string; onClick: () => void }) {
  const [, m, d] = g.date.split("-").map(Number);
  const dow = new Date(Date.UTC(Number(g.date.slice(0, 4)), m - 1, d)).getUTCDay();
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-4 border-l-2 border-orange/70 py-3 pl-4 pr-1 text-left transition hover:bg-white/[.03]">
      <div className="w-12 shrink-0 leading-none">
        <div className="text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{DOW[dow]}</div>
        <div className="my-0.5 text-[22px] font-black">{d}</div>
        <div className="text-[10px] font-extrabold uppercase text-dim">{MON[m - 1]}</div>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="truncate text-[15px] font-extrabold">{g.venueName}</span>
          <span className="rounded bg-card2 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wide text-[var(--acc)]">{relativeLabel(g.date, today)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5 text-[12.5px] font-semibold text-dim">
          <MapPin size={12} className="opacity-60" />
          {g.venueCity ? `${g.venueCity} · ` : ""}
          {isFinite(dist) ? formatDistance(dist) : ""}
          {g.startTime ? ` · ${formatTime(g.startTime)}` : ""}
        </div>
      </div>
      <ChevronRight size={18} className="shrink-0 text-dim2" />
    </button>
  );
}
