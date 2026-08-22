"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";
import { useBrassBands, useBrassConcerts, useBrassProductions } from "@/editions/hooks";

export default function BandDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { data: bands = [], isLoading } = useBrassBands();
  const { data: productions = [] } = useBrassProductions(id);
  const { data: concerts = [] } = useBrassConcerts();
  const band = bands.find((item) => item.id === id);
  const upcoming = concerts.filter((concert) => concert.artistId === id).slice(0, 12);

  if (isLoading) return <div className="mx-auto max-w-4xl px-4 py-12 text-dim">Loading Band…</div>;
  if (!band) return <div className="mx-auto max-w-4xl px-4 py-12"><Link href="/bands" className="text-sm font-bold text-[var(--acc)]">← Bands</Link><h1 className="mt-5 text-2xl font-black">Band not found</h1></div>;

  return <div className="mx-auto max-w-5xl px-4 pb-24 lg:px-8">
    <Link href="/bands" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-dim hover:text-txt"><ArrowLeft size={15}/>Bands</Link>
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div><div className="text-[10px] font-black uppercase tracking-[1.6px] text-[var(--acc)]">Brass band</div><h1 className="mt-1 text-4xl font-black tracking-tight">{band.name}</h1>{band.location && <p className="mt-3 flex items-center gap-2 text-dim"><MapPin size={15}/>{band.location}</p>}{band.bio && <p className="mt-6 max-w-3xl leading-7 text-dim">{band.bio}</p>}{band.websiteUrl && <a href={band.websiteUrl} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 text-sm font-black text-[var(--acc)]">Official website <ExternalLink size={14}/></a>}
        {band.nameVariants.length > 0 && <section className="mt-8"><h2 className="text-lg font-black">Known names</h2><div className="mt-3 flex flex-wrap gap-2">{band.nameVariants.map((name) => <span key={name} className="rounded-xl border border-line bg-card px-3 py-2 text-xs font-bold">{name}</span>)}</div></section>}
        {productions.length > 0 && <section className="mt-8"><h2 className="text-lg font-black">Productions</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{productions.map((production) => <div key={production.id} className="rounded-2xl border border-line bg-card p-4"><div className="text-[9px] font-black uppercase tracking-[1.2px] text-[var(--acc2)]">{production.productionKind?.replaceAll("_"," ") || "Production"}</div><h3 className="mt-1 font-black">{production.name}</h3>{production.description && <p className="mt-2 text-sm text-dim">{production.description}</p>}</div>)}</div></section>}
      </div>
      <aside className="rounded-2xl border border-line bg-card p-4"><div className="flex items-center justify-between"><h2 className="font-black">Upcoming Concerts</h2><span className="tnum text-sm font-black text-[var(--acc)]">{upcoming.length}</span></div><div className="mt-4 space-y-3">{upcoming.length ? upcoming.map((concert) => <div key={concert.id} className="border-t border-line pt-3 first:border-0 first:pt-0"><div className="text-sm font-black">{concert.productionName || concert.title}</div><div className="mt-1 text-xs text-dim">{concert.date}{concert.startTime ? ` · ${concert.startTime}` : ""}</div><div className="mt-1 text-xs">{concert.venueName}{concert.venueCity ? ` · ${concert.venueCity}` : ""}</div></div>) : <p className="text-sm text-dim">No upcoming Concerts found yet.</p>}</div></aside>
    </div>
  </div>;
}
