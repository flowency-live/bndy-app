"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Ticket } from "lucide-react";
import { useMemo, useState } from "react";
import { useBrassConcerts, useBrassFestivals } from "@/editions/hooks";
import { GigCard } from "@/features/gigs/GigCard";
import { ConcertSheet } from "@/features/concerts/ConcertSheet";
import type { Gig } from "@/domain/types";

export function BrassFestivalDetail({ slug }: { slug: string }) {
  const { data: festivals = [], isLoading } = useBrassFestivals();
  const { data: concerts = [] } = useBrassConcerts();
  const [selected, setSelected] = useState<Gig | null>(null);
  const festival = festivals.find((candidate) => candidate.slug === slug);
  const programme = useMemo(() => festival ? concerts.filter((concert) => concert.festivalId === festival.id) : [], [concerts, festival]);

  if (isLoading) return <div className="mx-auto max-w-content px-4 py-10 text-dim">Loading festival…</div>;
  if (!festival) return <div className="mx-auto max-w-content px-4 py-10 text-dim">Festival not found.</div>;

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-5 lg:px-8 lg:pb-12 lg:pt-9">
      <Link href="/festivals" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-dim hover:text-txt"><ArrowLeft size={15} /> Festivals</Link>
      <header className="rounded-[var(--rad-lg)] border border-line bg-card p-5 lg:p-7">
        <div className="text-[11px] font-extrabold text-[var(--acc)]">{festival.startDate}{festival.endDate !== festival.startDate ? ` – ${festival.endDate}` : ""}</div>
        <h1 className="mt-2 text-3xl font-black tracking-tight lg:text-5xl">{festival.name}</h1>
        {festival.location && <div className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-dim"><MapPin size={15} /> {festival.location}</div>}
        {festival.ticketed && <div className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-card2 px-2.5 py-1.5 text-[11px] font-extrabold text-dim"><Ticket size={13} /> Ticketed festival</div>}
      </header>

      <section className="mt-8">
        <div className="flex items-baseline justify-between"><h2 className="text-xl font-black">Concerts</h2><span className="text-[11px] font-bold text-dim">{programme.length}</span></div>
        {programme.length ? <div className="mt-3">{programme.map((concert) => <GigCard key={concert.id} gig={concert} tonight={false} onClick={() => setSelected(concert)} />)}</div> : <p className="mt-3 rounded-2xl border border-line bg-card p-5 text-[13px] font-semibold text-dim">Programme details not yet captured.</p>}
      </section>
      <ConcertSheet concert={selected} onClose={() => setSelected(null)} />
    </main>
  );
}
