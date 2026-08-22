"use client";

import { CalendarDays, MapPin, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useBrassConcerts } from "@/editions/hooks";

export default function ConcertsPage() {
  const { data: concerts = [], isLoading, error } = useBrassConcerts();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return concerts;
    return concerts.filter((concert) => `${concert.artistName ?? ""} ${concert.productionName ?? ""} ${concert.venueName} ${concert.venueCity ?? ""}`.toLowerCase().includes(q));
  }, [concerts, query]);

  return <div className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
    <div className="mb-6 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[1.7px] text-[var(--acc)]">bndy Brass</div><h1 className="mt-1 text-3xl font-black tracking-tight">Concerts</h1></div><div className="tnum text-2xl font-black">{isLoading ? "…" : filtered.length}</div></div>
    <div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search bands, productions or venues…" className="h-11 w-full rounded-2xl border border-line bg-card pl-10 pr-4 text-sm font-bold outline-none focus:border-[var(--acc)]" /></div>
    {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Could not load brass Concerts.</div>}
    <div className="space-y-3">{filtered.map((concert) => <article key={concert.id} className="rounded-2xl border border-line bg-card p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-[9px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">Concert</div><h2 className="mt-1 text-lg font-black">{concert.artistName || concert.title}</h2>{concert.productionName && <p className="mt-1 font-bold text-[var(--acc2)]">{concert.productionName}</p>}</div><div className="text-right"><div className="flex items-center justify-end gap-1.5 text-sm font-black"><CalendarDays size={14}/>{concert.date}</div>{concert.startTime && <div className="mt-1 text-xs text-dim">{concert.startTime}</div>}</div></div><div className="mt-3 flex items-center gap-2 text-sm text-dim"><MapPin size={14}/>{concert.venueName}{concert.venueCity ? ` · ${concert.venueCity}` : ""}</div>{concert.conductorName && <p className="mt-2 text-sm">Conducted by <strong>{concert.conductorName}</strong></p>}{concert.ticketUrl && <a href={concert.ticketUrl} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-black text-[var(--acc)]">Tickets ↗</a>}</article>)}</div>
  </div>;
}
