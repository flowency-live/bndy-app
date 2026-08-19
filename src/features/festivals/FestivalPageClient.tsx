"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, CalendarDays, Info, Map } from "lucide-react";
import { useFestival, useVenues } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { FestivalHero } from "./FestivalHero";
import { FestivalSchedule } from "./FestivalSchedule";
import { FestivalMap } from "./FestivalMap";
import { FestivalInfo } from "./FestivalInfo";

type View = "schedule" | "map" | "info";

export function FestivalPageClient({ slug }: { slug: string }) {
  const { data, isLoading, error } = useFestival(slug);
  const [view, setView] = useState<View>("schedule");
  // The schedule is the default mobile surface. Do not download the complete
  // venue catalogue until Info actually needs it; FestivalMap loads its own
  // venue data only when that tab mounts.
  const { data: allVenues = [] } = useVenues(view === "info");

  const participatingVenues = useMemo(() => {
    if (!data || view !== "info") return [];
    const ids = new Set([...data.festival.venueIds, ...data.childEvents.map((g) => g.venueId)]);
    return allVenues.filter((v) => ids.has(v.id));
  }, [data, allVenues, view]);

  if (isLoading) {
    return (
      <div className="mx-auto max-w-content px-4 pb-28 pt-5 lg:px-8">
        <div className="h-[330px] animate-pulse rounded-[var(--rad-lg)] border border-line bg-card lg:h-[420px]" />
        <div className="mt-4 h-14 animate-pulse rounded-xl border border-line bg-card lg:h-16" />
        <div className="mt-4 h-72 animate-pulse rounded-[var(--rad-lg)] border border-line bg-card lg:h-80" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <main className="mx-auto max-w-content px-4 pb-28 pt-8 lg:px-8">
        <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
          <h1 className="text-2xl font-black">We couldn&apos;t find that festival.</h1>
          <p className="mt-2 text-[13px] font-semibold text-dim">It may have moved, been unpublished, or not reached bndy yet.</p>
          <Link href="/festivals" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line bg-card2 px-4 py-2.5 text-[12px] font-black"><ArrowLeft size={14} /> All festivals</Link>
        </div>
      </main>
    );
  }

  const { festival, childEvents } = data;

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6">
      <Link href="/festivals" className="mb-3 inline-flex min-h-10 items-center gap-2 rounded-lg px-1 text-[11px] font-black text-dim transition-colors hover:text-txt">
        <ArrowLeft size={14} className="text-[var(--acc)]" /> All festivals
      </Link>
      <FestivalHero festival={festival} />

      <div className="sticky top-0 z-20 -mx-4 mt-4 border-y border-line bg-ink/92 px-4 py-2.5 backdrop-blur lg:static lg:mx-0 lg:mt-5 lg:rounded-[var(--rad-lg)] lg:border lg:bg-card lg:p-1.5 lg:shadow-[var(--shadow)]">
        <div className="grid grid-cols-3 gap-1.5" role="tablist" aria-label="Festival views">
          <Tab active={view === "schedule"} onClick={() => setView("schedule")} icon={<CalendarDays size={15} />} label="Schedule" />
          <Tab active={view === "map"} onClick={() => setView("map")} icon={<Map size={15} />} label="Map" />
          <Tab active={view === "info"} onClick={() => setView("info")} icon={<Info size={15} />} label="Info" />
        </div>
      </div>

      <div className="mt-5 lg:mt-6">
        {view === "schedule" && <FestivalSchedule festival={festival} gigs={childEvents} />}
        {view === "map" && <FestivalMap festival={festival} gigs={childEvents} />}
        {view === "info" && <FestivalInfo festival={festival} venues={participatingVenues} />}
      </div>
    </main>
  );
}

function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-[11.5px] font-black transition-[background-color,color,border-color,box-shadow,transform] active:scale-[.98]",
        active ? "border-[var(--acc)] bg-[var(--acc)] text-on-acc shadow-sm" : "border-transparent text-dim hover:bg-card2 hover:text-txt",
      )}
    >
      {icon}<span>{label}</span>
    </button>
  );
}
