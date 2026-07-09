"use client";

import Link from "next/link";
import { Clock, MapPin, Navigation, User } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { Avatar } from "@/components/ui/Avatar";
import { useArtistImageMap } from "@/lib/hooks";
import { prettyDate, formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import type { Gig } from "@/domain/types";

function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }

export function GigSheet({ gig, distance, onClose }: { gig: Gig | null; distance?: number; onClose: () => void }) {
  const imgMap = useArtistImageMap();
  const tonight = gig ? prettyDate(gig.date) === "Tonight" : false;
  const src = gig?.artistId ? imgMap.get(gig.artistId) : undefined;
  return (
    <Sheet open={!!gig} onClose={onClose}>
      {gig && (
        <>
          <div className="mb-3.5 flex items-center gap-3.5">
            <Avatar id={gig.artistId || gig.venueId} name={gig.artistName || gig.venueName} src={src} size={60} radius={15} />
            <div className="min-w-0">
              <div className="text-[21px] font-black leading-tight tracking-tight">{gig.artistName || gig.title}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-dim">
                <MapPin size={13} className="opacity-70" />
                <span className="truncate">{gig.venueName}{gig.venueCity ? ` · ${gig.venueCity}` : ""}</span>
              </div>
            </div>
          </div>

          <div className="mb-3.5 flex flex-wrap gap-2 text-[12px] font-extrabold">
            <span className={`rounded-lg px-2.5 py-1.5 ${tonight ? "bg-acc text-on-acc" : "bg-card2"}`}>{prettyDate(gig.date)}</span>
            {gig.startTime && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-card2 px-2.5 py-1.5">
                <Clock size={12} /> {formatTime(gig.startTime)}{gig.endTime ? ` – ${formatTime(gig.endTime)}` : ""}
              </span>
            )}
            {distance !== undefined && isFinite(distance) && (
              <span className="rounded-lg bg-card2 px-2.5 py-1.5 text-dim">{formatDistance(distance)} away</span>
            )}
            {gig.ticketed && <span className="rounded-lg bg-acc2 px-2.5 py-1.5 text-on-acc2">Ticketed</span>}
          </div>

          <a href={gmaps(gig.location.lat, gig.location.lng)} target="_blank" rel="noopener"
            className="bndy-btn mb-2.5 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
            <Navigation size={16} /> Directions
          </a>
          <div className="flex gap-2.5">
            {gig.artistId && (
              <Link href={`/artists/${gig.artistId}`} onClick={onClose} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
                <User size={16} /> Artist
              </Link>
            )}
            <Link href={`/venues/${gig.venueId}`} onClick={onClose} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
              <MapPin size={16} /> Venue
            </Link>
          </div>
        </>
      )}
    </Sheet>
  );
}
