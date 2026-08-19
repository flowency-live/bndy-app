"use client";

// /festivals - the discovery list.
//
// NO CALENDAR VIEW. V1 shipped one and it was twelve empty month grids around
// two festivals (Jason, 2026-08-20). It returns if density ever justifies it;
// the git history holds the code.
//
// ORDERED BY PROXIMITY. Distance and scope are DERIVED from each festival's
// venue set (festivalProximity) - there is no typed-in location field to
// drift. Near shows festivals within NEAR_MILES; All shows everything. With
// no geolocation permission the list quietly falls back to date order.

import Link from "next/link";
import { useMemo, useState } from "react";
import { CalendarDays, LocateFixed, MapPin } from "lucide-react";
import { useFestivals, useVenues } from "@/lib/hooks";
import { todayISO } from "@/domain/dates";
import { useGeolocation } from "@/lib/useGeolocation";
import type { Venue } from "@/domain/types";
import { cn } from "@/lib/cn";
import { FestivalCard } from "./FestivalCard";
import { festivalProximity } from "./festivalUtils";

/** "Near me" reach. Festivals are a travel surface, so this is deliberately
 *  wider than the gig feed's 5 miles. */
const NEAR_MILES = 75;

export function FestivalIndex() {
  const { data: festivals = [], isLoading, error } = useFestivals();
  const { data: venues = [] } = useVenues();
  const { location, located } = useGeolocation();
  const today = todayISO();
  const [reach, setReach] = useState<"near" | "all">("near");

  const venueById = useMemo(() => new Map<string, Venue>(venues.map((v) => [v.id, v])), [venues]);

  const upcoming = useMemo(() => {
    const list = festivals
      .filter((f) => f.endDate >= today)
      .map((f) => ({ festival: f, prox: festivalProximity(f, venueById, located ? location : undefined) }));
    // Nearest first; unknown distances sink; ties and the no-permission case
    // fall back to soonest first.
    return list.sort((a, b) => {
      const da = a.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
      const db = b.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
      if (da !== db) return da - db;
      return a.festival.startDate.localeCompare(b.festival.startDate);
    });
  }, [festivals, today, venueById, located, location]);

  const near = useMemo(
    () => upcoming.filter((x) => x.prox.distanceMiles !== undefined && x.prox.distanceMiles <= NEAR_MILES),
    [upcoming],
  );
  // Reach control only earns pixels when it changes the answer: geolocated,
  // and the near list differs from the full list.
  const reachUsable = located && near.length > 0 && near.length < upcoming.length;
  const shown = reachUsable && reach === "near" ? near : upcoming;

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-[calc(env(safe-area-inset-top,0px)+18px)] lg:px-8 lg:pb-12 lg:pt-9">
      <header className="relative overflow-hidden rounded-[var(--rad-lg)] border border-line bg-card p-5 shadow-[var(--shadow)] lg:p-7">
        <div className="absolute inset-x-0 top-0 h-1 bg-[var(--acc)]" />
        <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Plan something worth travelling for</div>
        <h1 className="font-disp mt-2 text-[36px] font-black leading-none tracking-tight lg:text-[52px]">Festivals</h1>
        <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-dim lg:text-[15px]">
          Grassroots festivals and short live-music programmes. Pick a weekend, explore the full schedule, then drop straight back into bndy gigs and venues.
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {reachUsable && (
            <div className="flex rounded-xl border border-line bg-card2 p-1">
              <ReachButton active={reach === "near"} onClick={() => setReach("near")} icon={<LocateFixed size={14} />} label={`Within ${NEAR_MILES} mi`} />
              <ReachButton active={reach === "all"} onClick={() => setReach("all")} icon={<MapPin size={14} />} label="All" />
            </div>
          )}
          <div className="ml-auto rounded-xl border border-line bg-card2 px-3 py-2 text-[12px] font-black">{upcoming.length} upcoming</div>
        </div>
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

      {!isLoading && !error && upcoming.length > 0 && (
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

function ReachButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[11px] font-black transition-all", active ? "border-[var(--acc)] bg-[var(--acc)] text-on-acc shadow-sm" : "border-transparent text-dim hover:text-txt")}
    >
      {icon}{label}
    </button>
  );
}
