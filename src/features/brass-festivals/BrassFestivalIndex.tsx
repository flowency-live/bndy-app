"use client";

import Link from "next/link";
import { CalendarDays, MapPin, Ticket } from "lucide-react";
import { useBrassFestivals } from "@/editions/hooks";
import { todayISO } from "@/domain/dates";

export function BrassFestivalIndex() {
  const { data: festivals = [], isLoading, error } = useBrassFestivals();
  const today = todayISO();
  const upcoming = festivals.filter((festival) => festival.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate));

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-9">
      <header className="rounded-[var(--rad-lg)] border border-line bg-card p-5 lg:p-7">
        <div className="font-meta text-[9px] font-black uppercase tracking-[2px] text-[var(--acc)]">Brass band weekends worth travelling for</div>
        <h1 className="font-disp mt-2 text-[36px] font-black leading-none tracking-tight lg:text-[52px]">Festivals</h1>
        <p className="mt-3 max-w-2xl text-[13px] font-semibold leading-relaxed text-dim lg:text-[15px]">Brass festivals and multi-concert programmes, kept separate from the grassroots festival catalogue.</p>
      </header>

      {isLoading && <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <div key={index} className="h-52 animate-pulse rounded-2xl border border-line bg-card" />)}</div>}
      {error && <div className="mt-6 rounded-2xl border border-line bg-card p-6 text-center font-bold text-dim">Couldn&apos;t load brass festivals right now.</div>}
      {!isLoading && !error && upcoming.length === 0 && <div className="mt-6 rounded-2xl border border-line bg-card p-8 text-center text-dim"><CalendarDays className="mx-auto mb-3 text-[var(--acc)]" />No upcoming brass festivals currently known.</div>}

      <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {upcoming.map((festival) => (
          <Link key={festival.id} href={`/festivals/${festival.slug}`} className="group rounded-2xl border border-line bg-card p-5 transition-transform hover:-translate-y-0.5">
            <div className="text-[11px] font-extrabold text-[var(--acc)]">{festival.startDate}{festival.endDate !== festival.startDate ? ` – ${festival.endDate}` : ""}</div>
            <h2 className="mt-2 text-xl font-black tracking-tight">{festival.name}</h2>
            {festival.location && <div className="mt-3 flex items-center gap-1.5 text-[12px] font-bold text-dim"><MapPin size={14} /> {festival.location}</div>}
            {festival.ticketed && <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-card2 px-2 py-1 text-[10px] font-extrabold text-dim"><Ticket size={12} /> Ticketed</div>}
          </Link>
        ))}
      </div>
    </main>
  );
}
