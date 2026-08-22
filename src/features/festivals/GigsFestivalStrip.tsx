"use client";

// The festival strip on the gigs page.
//
// PROXIMITY AND DATE GATED (Jason, 2026-08-20): a festival 200 miles away or
// eleven months out is noise on a "gigs near you" surface. The strip shows
// festivals whose NEAREST venue is within STRIP_MILES and which start inside
// STRIP_WEEKS. When geolocation is refused, the date gate still applies.
//
// MOBILE IS A ONE-LINE BANNER. The V1 cards owned half the first screen on a
// phone. Desktop keeps slim cards; the phone gets a signpost to /festivals.

import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchFestivals } from "@/lib/api";
import { useVenues } from "@/lib/hooks";
import { addDaysISO, todayISO } from "@/domain/dates";
import { useGeolocation } from "@/lib/useGeolocation";
import { formatDistance } from "@/domain/geo";
import type { Venue } from "@/domain/types";
import { FestivalCard } from "./FestivalCard";
import { festivalProximity, festivalStatus } from "./festivalUtils";

const STRIP_MILES = 50;
const STRIP_WEEKS = 8;
const STRIP_MAX = 3;
const MIN = 60 * 1000;

export function GigsFestivalStrip() {
  const today = todayISO();
  const horizon = addDaysISO(today, STRIP_WEEKS * 7);
  const { data: festivals = [], isLoading } = useQuery({
    queryKey: ["festivals", "gigs-strip", today, horizon],
    queryFn: () => fetchFestivals({ startDate: today, endDate: horizon }),
    staleTime: 5 * MIN,
    gcTime: 30 * MIN,
  });
  const { data: venues = [] } = useVenues();
  const { location, located } = useGeolocation();

  const venueById = useMemo(() => new Map<string, Venue>(venues.map((v) => [v.id, v])), [venues]);

  const relevant = useMemo(() => {
    return festivals
      .filter((f) => f.endDate >= today && f.startDate <= horizon)
      .map((f) => ({ festival: f, prox: festivalProximity(f, venueById, located ? location : undefined) }))
      .filter((x) => !located || (x.prox.distanceMiles !== undefined && x.prox.distanceMiles <= STRIP_MILES))
      .sort((a, b) => {
        const da = a.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
        const db = b.prox.distanceMiles ?? Number.POSITIVE_INFINITY;
        if (da !== db) return da - db;
        return a.festival.startDate.localeCompare(b.festival.startDate);
      })
      .slice(0, STRIP_MAX);
  }, [festivals, today, horizon, venueById, located, location]);

  if (isLoading) {
    return (
      <section className="mx-auto max-w-content px-4 pt-[calc(env(safe-area-inset-top,0px)+34px)] lg:px-8 lg:pt-3" aria-hidden>
        <div className="h-[41px] animate-pulse rounded-xl border border-line bg-card/50 lg:h-[158px]" />
      </section>
    );
  }
  if (relevant.length === 0) return null;

  const first = relevant[0];
  const bannerWhen = festivalStatus(first.festival, today);
  const bannerMiles = first.prox.distanceMiles !== undefined ? ` · ${formatDistance(first.prox.distanceMiles)}` : "";

  return (
    <section
      // Mobile top padding clears the fixed ticker (safe area + strip height).
      // pt-1 sat the banner underneath it (Jason, 2026-08-20).
      className="mx-auto max-w-content px-4 pt-[calc(env(safe-area-inset-top,0px)+34px)] lg:px-8 lg:pt-3"
    >
      {/* Phone: one line, no cards. */}
      <Link
        href="/festivals"
        className="flex items-center gap-2 rounded-xl border px-3 py-2.5 lg:hidden"
        style={{
          borderColor: "color-mix(in srgb, var(--acc) 58%, var(--line))",
          background: "linear-gradient(105deg, color-mix(in srgb, var(--acc) 22%, var(--card)) 0%, var(--card) 85%)",
          boxShadow: "inset 3px 0 0 var(--acc)",
        }}
      >
        <CalendarRange size={15} className="shrink-0 text-[var(--acc)]" />
        <span className="min-w-0 flex-1 truncate text-[12px] font-black">
          {relevant.length === 1 ? `${first.festival.name} · ${bannerWhen}${bannerMiles}` : `${relevant.length} festivals near you`}
        </span>
        <ArrowRight size={15} className="shrink-0 text-dim" />
      </Link>

      {/* Desktop: slim cards, already distance-ordered. */}
      <div className="hidden lg:block">
        <div className="mb-2.5 flex items-end gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc)]"><CalendarRange size={12} /> Worth planning around</div>
            <h2 className="mt-1 text-[19px] font-black tracking-tight lg:text-[23px]">Festivals near you</h2>
          </div>
          <Link href="/festivals" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[10.5px] font-black text-txt transition-colors hover:border-line-hi">All festivals <ArrowRight size={13} /></Link>
        </div>
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
          {relevant.map(({ festival, prox }) => <FestivalCard key={festival.id} festival={festival} proximity={prox} compact />)}
        </div>
      </div>
    </section>
  );
}
