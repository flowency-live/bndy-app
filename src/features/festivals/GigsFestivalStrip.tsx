"use client";

import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import { useFestivals } from "@/lib/hooks";
import { addDaysISO, todayISO } from "@/domain/dates";
import { FestivalCard } from "./FestivalCard";

export function GigsFestivalStrip() {
  const { data: festivals = [], isLoading } = useFestivals();
  const today = todayISO();
  const horizon = addDaysISO(today, 120);
  const relevant = festivals.filter((f) => f.endDate >= today && f.startDate <= horizon).slice(0, 4);

  if (isLoading || relevant.length === 0) return null;

  return (
    <section className="mx-auto max-w-content px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] lg:px-8 lg:pt-7">
      <div className="mb-2.5 flex items-end gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc)]"><CalendarRange size={12} /> Worth planning around</div>
          <h2 className="mt-1 text-[19px] font-black tracking-tight lg:text-[23px]">Upcoming festivals</h2>
        </div>
        <Link href="/festivals" className="flex shrink-0 items-center gap-1.5 rounded-lg border border-line bg-card px-3 py-2 text-[10.5px] font-black text-txt transition-colors hover:border-line-hi">All festivals <ArrowRight size={13} /></Link>
      </div>
      <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-2 lg:overflow-visible lg:px-0 xl:grid-cols-4">
        {relevant.map((festival) => <div key={festival.id} className="w-[82vw] max-w-[360px] shrink-0 snap-start lg:w-auto lg:max-w-none"><FestivalCard festival={festival} compact /></div>)}
      </div>
    </section>
  );
}
