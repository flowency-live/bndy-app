"use client";

import Link from "next/link";
import { Navigation, Calendar, Share2, Globe, Facebook, ChevronRight, ExternalLink } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { useArtistImageMap } from "@/lib/hooks";
import { formatTime } from "@/domain/dates";
import type { Gig, Venue } from "@/domain/types";

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function dateParts(iso: string) { const [y, m, d] = iso.split("-").map(Number); const dt = new Date(y, m - 1, d); return { dow: DOW[dt.getDay()], day: d, mon: MON[m - 1] }; }
function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }

export function VenueSheet({ venue, gigs, live, onClose, onGigClick }: {
  venue: Venue | null; gigs: Gig[]; live: boolean; onClose: () => void; onGigClick: (g: Gig) => void;
}) {
  const imgMap = useArtistImageMap();
  const share = () => {
    if (!venue) return;
    const url = typeof window !== "undefined" ? `${window.location.origin}/venues/${venue.id}` : "";
    if (typeof navigator !== "undefined" && navigator.share) navigator.share({ title: venue.name, url }).catch(() => {});
    else if (typeof navigator !== "undefined" && navigator.clipboard) navigator.clipboard.writeText(url).catch(() => {});
  };
  const website = venue?.socials?.find((s) => s.platform === "website")?.url || venue?.website;
  const facebook = venue?.socials?.find((s) => s.platform === "facebook")?.url;

  return (
    <Sheet open={!!venue} onClose={onClose}>
      {venue && (
        <>
          <span className="mb-3 inline-flex items-center gap-1.5 rounded-lg bg-acc2 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-[1px] text-on-acc2">Live music venue</span>
          <div className="mb-3 flex items-center gap-3.5">
            <Avatar id={venue.id} name={venue.name} size={56} radius={15} />
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[21px] font-black leading-tight tracking-tight">
                <span className="truncate">{venue.name}</span>
                {live && <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--acc2)] shadow-[0_0_8px_var(--acc2)]" />}
              </div>
              {venue.address && <div className="mt-1 text-[13px] font-medium text-dim">{venue.address}</div>}
              {venue.city && <div className="mt-0.5 text-[13px] font-bold">{venue.city}</div>}
            </div>
          </div>

          <div className="mb-4 flex gap-2.5">
            <a href={gmaps(venue.location.lat, venue.location.lng)} target="_blank" rel="noopener"
              className="bndy-btn flex flex-1 items-center justify-center gap-2 py-3 text-[13.5px] transition-transform active:scale-[.97]">
              <Navigation size={16} /> Directions
            </a>
            <Link href={`/venues/${venue.id}`} onClick={onClose} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3 text-[13.5px] transition-transform active:scale-[.97]">
              <Calendar size={16} /> View gigs
            </Link>
            <button onClick={share} aria-label="Share venue" className="bndy-btn2 flex w-12 items-center justify-center transition-transform active:scale-[.94]">
              <Share2 size={17} />
            </button>
          </div>

          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-[var(--acc2)]">Upcoming gigs</h3>
            <Link href={`/venues/${venue.id}`} onClick={onClose} className="flex items-center gap-1 text-[12px] font-bold text-dim">View all <ExternalLink size={12} /></Link>
          </div>

          {gigs.length ? (
            <div className="divide-y divide-line">
              {gigs.slice(0, 12).map((g) => {
                const dp = dateParts(g.date);
                return (
                  <button key={g.id} onClick={() => onGigClick(g)} className="flex w-full items-center gap-3 py-2.5 text-left transition active:opacity-70">
                    <div className="w-[46px] shrink-0 rounded-xl border border-[var(--acc2)] py-1.5 text-center leading-none">
                      <div className="text-[9px] font-extrabold uppercase text-[var(--acc2)]">{dp.dow}</div>
                      <div className="my-0.5 text-[17px] font-black">{dp.day}</div>
                      <div className="text-[9px] font-extrabold uppercase text-dim">{dp.mon}</div>
                    </div>
                    <Avatar id={g.artistId || g.id} name={g.artistName || g.title} src={g.artistId ? imgMap.get(g.artistId) : undefined} size={34} radius={17} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[14.5px] font-extrabold">{g.artistName || g.title}</div>
                      {g.startTime && <div className="text-[12px] font-semibold text-dim">{formatTime(g.startTime)}</div>}
                    </div>
                    <ChevronRight size={17} className="shrink-0 text-dim2" />
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="py-6 text-center text-[13px] font-semibold text-dim">No upcoming gigs listed.</p>
          )}

          {(website || facebook) && (
            <div className="mt-4 flex items-center justify-center gap-6 border-t border-line pt-4 text-[13px] font-bold text-dim">
              {website && <a href={website} target="_blank" rel="noopener" className="flex items-center gap-1.5"><Globe size={15} /> Website</a>}
              {facebook && <a href={facebook} target="_blank" rel="noopener" className="flex items-center gap-1.5"><Facebook size={15} /> Facebook</a>}
            </div>
          )}
        </>
      )}
    </Sheet>
  );
}
