"use client";

import { CalendarDays, MapPin } from "lucide-react";
import { useBrassFestivals } from "@/editions/hooks";

export function BrassFestivalIndex() {
  const { data: festivals = [], isLoading, error } = useBrassFestivals();
  return <div className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
    <div className="mb-6 flex items-end justify-between"><div><div className="text-[10px] font-black uppercase tracking-[1.7px] text-[var(--acc)]">bndy Brass</div><h1 className="mt-1 text-3xl font-black tracking-tight">Festivals</h1></div><div className="tnum text-2xl font-black">{isLoading ? "…" : festivals.length}</div></div>
    {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Could not load brass Festivals.</div>}
    {!isLoading && !error && festivals.length === 0 && <div className="rounded-2xl border border-line bg-card p-8 text-center"><h2 className="text-lg font-black">Festival intelligence is building</h2><p className="mt-2 text-sm text-dim">Verified brass Festivals will appear here as they are projected into bndy.</p></div>}
    <div className="grid gap-3 md:grid-cols-2">{festivals.map((festival) => <article key={festival.id} className="rounded-2xl border border-line bg-card p-5"><div className="text-[9px] font-black uppercase tracking-[1.2px] text-[var(--acc2)]">Festival</div><h2 className="mt-1 text-xl font-black">{festival.name}</h2><div className="mt-3 flex items-center gap-2 text-sm font-bold"><CalendarDays size={14}/>{festival.startDate}{festival.endDate !== festival.startDate ? ` to ${festival.endDate}` : ""}</div>{festival.location && <div className="mt-2 flex items-center gap-2 text-sm text-dim"><MapPin size={14}/>{festival.location}</div>}{festival.description && <p className="mt-4 text-sm leading-6 text-dim">{festival.description}</p>}{festival.websiteUrl && <a href={festival.websiteUrl} target="_blank" rel="noreferrer" className="mt-4 inline-block text-sm font-black text-[var(--acc)]">Festival website ↗</a>}</article>)}</div>
  </div>;
}
