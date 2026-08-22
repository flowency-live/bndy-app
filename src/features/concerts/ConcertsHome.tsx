"use client";

import { useDeferredValue, useMemo, useState } from "react";
import { Heart, Search, Ticket } from "lucide-react";
import { useBrassConcerts } from "@/editions/hooks";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useFavourites } from "@/lib/favourites";
import { useGeolocation } from "@/lib/useGeolocation";
import { distanceMiles } from "@/domain/geo";
import { inWhenRange, todayISO, type WhenRange } from "@/domain/dates";
import { bucketGigs, dayHeading } from "@/domain/gigGrouping";
import { GigCard } from "@/features/gigs/GigCard";
import { GigDatePicker, gigDateLabel, type DateSel } from "@/features/gigs/GigDatePicker";
import { LocationField, type OriginChoice } from "@/features/gigs/LocationField";
import { ConcertSheet } from "./ConcertSheet";
import type { Gig, LatLng } from "@/domain/types";
import { cn } from "@/lib/cn";

const WHENS: { k: WhenRange; l: string }[] = [
  { k: "all", l: "Anytime" },
  { k: "tonight", l: "Tonight" },
  { k: "weekend", l: "Weekend" },
  { k: "week", l: "7 days" },
];

export function ConcertsHome() {
  const { data: concerts = [], isLoading } = useBrassConcerts();
  const { location: geo, located } = useGeolocation();
  const today = todayISO();
  const [origin, setOrigin] = useState<OriginChoice>({ loc: null, label: "Current location" });
  const [radius, setRadius] = useState(25);
  const [when, setWhen] = useState<WhenRange>("all");
  const [dateSel, setDateSel] = useState<DateSel | null>(null);
  const [ticketOnly, setTicketOnly] = useState(false);
  const [q, setQ] = useState("");
  const { isAuthenticated } = useAuth();
  const { artistSet: favArtists } = useFavourites();
  const [favOnly, setFavOnly] = useState(false);
  const [selected, setSelected] = useState<Gig | null>(null);

  const dq = useDeferredValue(q);
  const originLoc: LatLng = useMemo(() => origin.loc ?? geo, [origin.loc, geo]);
  const eligible = useMemo(() => {
    const query = dq.trim().toLowerCase();
    let list = concerts.filter((concert) => concert.date >= today);
    if (ticketOnly) list = list.filter((concert) => concert.ticketing?.isTicketed ?? concert.ticketed);
    if (favOnly && isAuthenticated) list = list.filter((concert) => !!concert.artistId && favArtists.has(concert.artistId));
    if (query) {
      list = list.filter((concert) =>
        `${concert.artistName ?? ""} ${concert.productionName ?? ""} ${concert.venueName} ${concert.title} ${concert.festivalName ?? ""}`
          .toLowerCase()
          .includes(query),
      );
    }
    return list
      .map((concert) => ({ concert, distance: distanceMiles(originLoc, concert.location) }))
      .filter(({ distance }) => distance <= radius);
  }, [concerts, dq, favArtists, favOnly, isAuthenticated, originLoc, radius, ticketOnly, today]);

  const dayCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const { concert } of eligible) counts.set(concert.date, (counts.get(concert.date) ?? 0) + 1);
    return counts;
  }, [eligible]);

  const filtered = useMemo(
    () => eligible.filter(({ concert }) => dateSel
      ? concert.date >= dateSel.start && concert.date <= dateSel.end
      : inWhenRange(concert.date, when, today)),
    [eligible, dateSel, when, today],
  );

  const distanceById = useMemo(() => new Map(filtered.map(({ concert, distance }) => [concert.id, distance])), [filtered]);
  const buckets = useMemo(() => bucketGigs(filtered.map(({ concert }) => concert), today), [filtered, today]);
  const total = filtered.length;

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
      <header className="mb-5 hidden lg:block">
        <h1 className="font-disp text-[38px] font-black leading-none tracking-tight">Concerts near you</h1>
        <p className="mt-1.5 text-[13px] font-semibold text-dim">
          {isLoading ? "Finding concerts…" : `${total} concert${total === 1 ? "" : "s"} within ${radius} mi of ${origin.label}`}
          {origin.loc === null && !located ? " · allow location for near-you results" : ""}
        </p>
      </header>

      <div className="mb-5 grid gap-2.5 lg:grid-cols-[minmax(260px,1fr)_auto_minmax(230px,.72fr)] lg:items-center">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            aria-label="Search concerts by band, production, venue or festival"
            placeholder="Search bands, productions, venues…"
            className="w-full rounded-[var(--rad)] border border-line glass px-10 py-3 text-[14px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]"
          />
        </div>
        <LocationField value={origin} onChange={setOrigin} />
        <div className="flex items-center gap-2.5 lg:px-1">
          <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[1.3px] text-dim2">within</span>
          <input type="range" min={1} max={150} value={radius} onChange={(e) => setRadius(Number(e.target.value))} className="h-1.5 flex-1 cursor-pointer" style={{ accentColor: "var(--acc)" }} />
          <span className="w-[52px] shrink-0 text-right text-[12px] font-extrabold tnum">{radius} mi</span>
        </div>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        {WHENS.map((option) => (
          <button
            key={option.k}
            onClick={() => { setWhen(option.k); setDateSel(null); }}
            className={cn(
              "rounded-xl border px-3 py-2 text-[11px] font-extrabold",
              !dateSel && when === option.k ? "border-[var(--acc)] bg-acc text-on-acc" : "border-line glass text-dim",
            )}
          >
            {option.l}
          </button>
        ))}
        <GigDatePicker value={dateSel} onChange={setDateSel} today={today} dayCounts={dayCounts} />
        {isAuthenticated && (
          <button
            onClick={() => setFavOnly((value) => !value)}
            className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-extrabold", favOnly ? "border-red-500/60 bg-red-500/15 text-red-500" : "border-line glass text-dim")}
          >
            <Heart size={14} fill={favOnly ? "currentColor" : "none"} /> Favourites
          </button>
        )}
        <button
          onClick={() => setTicketOnly((value) => !value)}
          className={cn("inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-extrabold", ticketOnly ? "border-green-500/60 bg-green-500/15 text-green-500" : "border-line glass text-dim")}
        >
          <Ticket size={14} /> Tickets
        </button>
        <div className="ml-auto flex min-w-[76px] flex-col items-center justify-center rounded-xl border border-line px-3 py-1.5">
          <span className="tnum text-[18px] font-black leading-none">{isLoading ? "…" : total}</span>
          <span className="mt-1 text-[8px] font-black uppercase tracking-[1.3px] text-[var(--acc)]">Concerts</span>
        </div>
      </div>

      {dateSel && <div className="mb-3 text-[11px] font-bold text-dim">Showing {gigDateLabel(dateSel, today)}</div>}

      {isLoading ? (
        <div>{Array.from({ length: 7 }).map((_, index) => <div key={index} className="h-[100px] animate-pulse border-b border-line bg-card/40" />)}</div>
      ) : buckets.length ? (
        buckets.map((bucket) => (
          <section key={bucket.key} className="mt-7 first:mt-0">
            <h2 className="mb-2 text-[13px] font-black uppercase tracking-[1.2px] text-dim">{bucket.label}</h2>
            <div className="space-y-5">
              {bucket.days.map((day) => (
                <div key={day.date}>
                  <h3 className="mb-1 px-2 text-[11px] font-extrabold text-dim2">{dayHeading(day.date, today)}</h3>
                  {day.gigs.map((concert) => (
                    <GigCard
                      key={concert.id}
                      gig={concert}
                      distance={distanceById.get(concert.id)}
                      tonight={concert.date === today}
                      onClick={() => setSelected(concert)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </section>
        ))
      ) : (
        <p className="py-16 text-center font-semibold text-dim">No concerts found for these filters.</p>
      )}

      <ConcertSheet concert={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
