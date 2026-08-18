import Link from "next/link";
import { ExternalLink, MapPin, Ticket } from "lucide-react";
import type { Festival, Venue } from "@/domain/types";
import { safeHref } from "@/lib/safeHref";

export function FestivalInfo({ festival, venues }: { festival: Festival; venues: Venue[] }) {
  const website = safeHref(festival.websiteUrl);
  const ticketUrl = safeHref(festival.ticketUrl);
  const socials = (festival.socialMediaUrls || []).map(safeHref).filter((x): x is string => !!x);

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(280px,.6fr)]">
      <section className="rounded-[var(--rad-lg)] border border-line bg-card p-5 lg:p-6">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.8px] text-[var(--acc)]">About the festival</div>
        {festival.description ? (
          <p className="mt-3 whitespace-pre-line text-[14px] font-semibold leading-7 text-dim">{festival.description}</p>
        ) : (
          <p className="mt-3 text-[13px] font-semibold text-dim">No extra festival information has been published yet.</p>
        )}
        {(website || ticketUrl || socials.length > 0) && (
          <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-4">
            {website && <a href={website} target="_blank" rel="noopener" className="bndy-btn2 inline-flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-black">Festival website <ExternalLink size={14} /></a>}
            {ticketUrl && <a href={ticketUrl} target="_blank" rel="noopener" className="bndy-btn inline-flex items-center gap-2 px-3.5 py-2.5 text-[12px] font-black"><Ticket size={14} /> Tickets</a>}
            {socials.map((url, i) => <a key={url} href={url} target="_blank" rel="noopener" className="bndy-btn2 inline-flex items-center gap-2 px-3 py-2.5 text-[11px] font-black">Social {i + 1} <ExternalLink size={13} /></a>)}
          </div>
        )}
      </section>

      <section className="rounded-[var(--rad-lg)] border border-line bg-card p-5 lg:p-6">
        <div className="flex items-center gap-2 font-meta text-[9px] font-black uppercase tracking-[1.8px] text-[var(--acc)]"><MapPin size={13} /> Participating venues</div>
        <div className="mt-3 space-y-2">
          {venues.length ? venues.map((venue) => (
            <Link key={venue.id} href={`/venues/${venue.id}`} className="block rounded-xl border border-line bg-card2 px-3.5 py-3 transition-colors hover:border-line-hi">
              <div className="text-[13px] font-black text-txt">{venue.name}</div>
              {(venue.city || venue.address) && <div className="mt-1 text-[11px] font-semibold text-dim">{venue.city || venue.address}</div>}
            </Link>
          )) : <div className="rounded-xl border border-line bg-card2 p-4 text-[12px] font-semibold text-dim">Venue details are still being linked.</div>}
        </div>
      </section>
    </div>
  );
}
