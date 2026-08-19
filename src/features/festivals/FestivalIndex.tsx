"use client";

// /festivals - the discovery list.
//
// NO CALENDAR VIEW. V1 shipped one and it was twelve empty month grids around
// two festivals (Jason, 2026-08-20). It returns if density ever justifies it;
// the git history holds the code.
//
// ORDERED BY PROXIMITY. Distance and scope are DERIVED from each festival's
// venue set (festivalProximity). The control is THE SAME pair as /gigs
// (Jason, 2026-08-20): a LocationField and a radius slider, so a user can
// plan around any town, not just where they stand. "Show all" bypasses the
// radius because festivals are a travel surface. With no location at all the
// list quietly falls back to soonest first.

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { useFestivals, useVenues } from "@/lib/hooks";
import { todayISO } from "@/domain/dates";
import { useGeolocation } from "@/lib/useGeolocation";
import type { LatLng, Venue } from "@/domain/types";
import { cn } from "@/lib/cn";
import { LocationField, type OriginChoice } from "@/features/gigs/LocationField";
import { FestivalCard } from "./FestivalCard";
import { festivalProximity } from "./festivalUtils";

/** Default reach. Festivals are a travel surface, so this is deliberately
 *  wider than the gig feed's 5 miles. */
const DEFAULT_MILES = 75;
const MAX_MILES = 250;

export function FestivalIndex() {
  const { data: festivals = [], isLoading, error } = useFestivals();
  const { data: venues = [] } = useVenues();
  const { location: geo, located } = useGeolocation();
  const today = todayISO();
  // Same origin pattern as GigsHome: null loc = follow the device.
  const [origin, setOrigin] = useState<OriginChoice>({ loc: null, label: "Current location" });
  const [radius, setRadius] = useState(DEFAULT_MILES);
  const [showAll, setShowAll] = useState(false);

  const originLoc: LatLng | undefined = origin.loc ?? (located ? geo : undefined);
  const venueById = useMemo(() => new Map<string, Venue>(venues.map((v) => [v.id, v])), [venues]);

  const upcoming = useMemo(() => {
    const list = festivals
      .filter((f) => f.endDate >= today)
      .map((f) => ({ festival: f, prox: festivalProximity(f, venueById, originLoc) }));
    // Nearest first; unknown distances sink; ties and the no-location case
    // fall back to soonest first.
    return list.sort((a, b) => {
      const da = a.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
      const db = b.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.festival.startDate.localeCompare(b.festival.startDate);
    });
  }, [festivals, today, venueById, originLoc]);

  const near = useMemo(
    () => upcoming.filter((x) => x.prox.distanceMiles !== undefined && x.prox.distanceMiles <= radius),
    [upcoming, radius],
  );
  // No usable location = radius means nothing, show everything.
  const shown = showAll || !originLoc ? upcoming : near;
  const hiddenCount = upcoming.length - shown.length;

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+18px)] lg:px-8 lg:pb-12 lg:pt-9">
      <header className="relative overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card p-5 shadow-[var(--shadow)] lg:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--acc)]" />
        <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Plan something worth travelling for</div>
        <h1 className="font-disp mt-2 text-[36px] font-black leading-none tracking-tight lg:text-[52px]">Festivals</h1>
        <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-dim lg:text-[15px]">
          Grassroots festivals and short live-music programmes. Pick a weekend, explore the full schedule, then drop straight back into bndy gigs and venues.
        </p>
        {/* The same pair /gigs uses: pick a place, set a reach. Show all is
            the escape hatch because a festival worth travelling to may sit
            outside any radius a slider offers. */}
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-[minmax(240px,.9fr)_auto_auto_1fr] lg:items-center">
          <LocationField value={origin} onChange={setOrigin} />
          <div className={cn("flex min-w-[190px] items-center gap-2.5 lg:px-1", (showAll || !originLoc) && "opacity-40")}>
            <span className="shrink-0 text-[9.5px] font-bold uppercase tracking-[1.3px] text-dim2">within</span>
            <input
              type="range"
              min={10}
              max={MAX_MILES}
              step={5}
              value={radius}
              onChange={(e) => { setRadius(Number(e.target.value)); setShowAll(false); }}
              disabled={showAll || !originLoc}
              aria-label="Festival search radius in miles"
              className="h-1.5 flex-1 cursor-pointer"
              style={{ accentColor: "var(--acc)" }}
            />
            <span className="w-[52px] shrink-0 text-right text-[12px] font-extrabold tnum">{radius} mi</span>
          </div>
          <button
            type="button"
            aria-pressed={showAll}
            onClick={() => setShowAll((v) => !v)}
            className={cn(
              "rounded-xl border px-3 py-2 text-[11px] font-black transition-all",
              showAll ? "border-[var(--acc)] bg-[var(--acc)] text-on-acc shadow-sm" : "border-line bg-card2 text-dim hover:text-txt",
            )}
          >
            Show all
          </button>
          <div className="justify-self-start rounded-xl border border-line bg-card2 px-3 py-2 text-[12px] font-black lg:justify-self-end">
            {shown.length} of {upcoming.length} upcoming
          </div>
        </div>
        {!showAll && originLoc && hiddenCount > 0 && (
          <p className="mt-2 text-[11px] font-semibold text-dim">
            {hiddenCount} more further out. Widen the radius or press Show all.
          </p>
        )}
        {!originLoc && (
          <p className="mt-2 text-[11px] font-semibold text-dim">
            Allow location or type a town to sort by distance. Showing everything, soonest first.
          </p>
        )}
      </header>

      {isLoading && <div className="mt-6 grid gap-4 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-64 animate-pulse rounded-[var(--rad-lg)] border border-line bg-card" />)}</div>}
      {error && <div className="mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-6 text-center font-bold text-dim">Couldn&apos;t load festivals right now.</div>}

      {!isLoading && !error && upcoming.length === 0 && (
        <div className="mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
          <CalendarDays size={28} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-3 text-xl font-black">No upcoming grassroots festivals listed yet.</h2>
          <Link href="/gigs" className="mt-4 inline-flex rounded-xl bg-[var(--acc)] px-4 py-2.5 text-[12px] font-black text-on-acc">Browse gigs instead</Link>
        </div>
      )}

      {!isLoading && !error && upcoming.length > 0 && shown.length === 0 && (
        <div className="mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
          <CalendarDays size={28} className="mx-auto text-[var(--acc)]" />
          <h2 className="mt-3 text-xl font-black">Nothing within {radius} mi of {origin.label}.</h2>
          <button type="button" onClick={() => setShowAll(true)} className="mt-4 inline-flex rounded-xl bg-[var(--acc)] px-4 py-2.5 text-[12px] font-black text-on-acc">
            Show all {upcoming.length} upcoming
          </button>
        </div>
      )}

      {!isLoading && !error && shown.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {shown.map(({ festival, prox }) => <FestivalCard key={festival.id} festival={festival} proximity={prox} />)}
        </div>
      )}

      {!isLoading && upcoming.length > 0 && (
        <footer className="mt-8 flex items-start gap-2 rounded-xl border border-line bg-card2 px-4 py-3 text-[11px] font-semibold text-dim">
          <MapPin size={14} className="mt-0.5 shrink-0 text-[var(--acc)]" />
          Festivals are deliberately broader than your normal gig radius. This page is for finding programmes you might travel to.
        </footer>
      )}
    </main>
  );
}
