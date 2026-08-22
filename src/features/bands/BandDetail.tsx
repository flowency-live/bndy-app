"use client";

import Link from "next/link";
import { ArrowLeft, CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { useBrassBands, useBrassConcerts, useBrassProductions } from "@/editions/hooks";
import { ArtistTile } from "@/features/artists/ArtistTile";
import { GigCard } from "@/features/gigs/GigCard";
import { ConcertSheet } from "@/features/concerts/ConcertSheet";
import { useMemo, useState } from "react";
import type { Gig } from "@/domain/types";

export function BandDetail({ id }: { id: string }) {
  const { data: bands = [], isLoading } = useBrassBands();
  const { data: concerts = [] } = useBrassConcerts();
  const { data: productions = [] } = useBrassProductions(id);
  const [selected, setSelected] = useState<Gig | null>(null);
  const band = bands.find((candidate) => candidate.id === id);
  const bandConcerts = useMemo(
    () => concerts.filter((concert) => concert.artistId === id).sort((a, b) => `${a.date}${a.startTime ?? ""}`.localeCompare(`${b.date}${b.startTime ?? ""}`)),
    [concerts, id],
  );

  if (isLoading) return <div className="mx-auto max-w-content px-4 py-10 text-dim">Loading band…</div>;
  if (!band) return <div className="mx-auto max-w-content px-4 py-10 text-dim">Band not found.</div>;

  const officialSite = band.domainProfiles?.brass?.officialWebsiteUrl || band.socials?.find((social) => social.platform === "website")?.url;

  return (
    <div className="mx-auto max-w-content px-4 pb-24 pt-5 lg:px-8 lg:pb-10 lg:pt-8">
      <Link href="/bands" className="mb-5 inline-flex items-center gap-1.5 text-[12px] font-extrabold text-dim hover:text-txt">
        <ArrowLeft size={15} /> Bands
      </Link>

      <section className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
        <div className="max-w-[220px]">
          <ArtistTile artist={band} hrefBase="/bands" gigging={bandConcerts.length > 0} activeLabel="Concert coming up" />
        </div>
        <div>
          <h1 className="text-3xl font-black tracking-tight lg:text-5xl">{band.name}</h1>
          {band.location && <div className="mt-2 flex items-center gap-1.5 text-[14px] font-bold text-dim"><MapPin size={15} /> {band.location}</div>}
          {band.bio && <p className="mt-5 max-w-3xl whitespace-pre-line text-[15px] font-medium leading-7 text-dim">{band.bio}</p>}
          {officialSite && (
            <a href={officialSite} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-2 rounded-xl border border-line glass px-4 py-2.5 text-[12px] font-extrabold">
              Official website <ExternalLink size={14} />
            </a>
          )}

          {(band.names?.length ?? 0) > 1 && (
            <div className="mt-6">
              <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-dim2">Also known as</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {band.names!.filter((name) => name.name !== band.name).map((name) => (
                  <span key={`${name.nameType}-${name.name}`} className="rounded-lg border border-line bg-card2 px-2.5 py-1 text-[11px] font-bold text-dim">{name.name}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {productions.length > 0 && (
        <section className="mt-10">
          <h2 className="text-xl font-black tracking-tight">Productions</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {productions.map((production) => (
              <article key={production.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="text-[16px] font-black">{production.name}</div>
                {production.description && <p className="mt-2 line-clamp-4 text-[12.5px] font-medium leading-5 text-dim">{production.description}</p>}
                {production.websiteUrl && <a href={production.websiteUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-extrabold text-[var(--acc)]">More <ExternalLink size={12} /></a>}
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-xl font-black tracking-tight">Upcoming concerts</h2>
          <span className="text-[11px] font-extrabold text-dim">{bandConcerts.length}</span>
        </div>
        {bandConcerts.length ? (
          <div className="mt-3">
            {bandConcerts.map((concert) => <GigCard key={concert.id} gig={concert} tonight={false} onClick={() => setSelected(concert)} />)}
          </div>
        ) : (
          <div className="mt-3 flex items-center gap-2 rounded-2xl border border-line bg-card p-4 text-[13px] font-semibold text-dim"><CalendarDays size={16} /> No upcoming concerts currently known.</div>
        )}
      </section>

      <ConcertSheet concert={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
