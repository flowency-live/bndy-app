"use client";

import { MapPin, Navigation, Ticket, X } from "lucide-react";
import { formatTime } from "@/domain/dates";
import type { Gig } from "@/domain/types";

function mapsUrl(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function ConcertSheet({ concert, onClose }: { concert: Gig | null; onClose: () => void }) {
  if (!concert) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm lg:items-center lg:p-6" onMouseDown={onClose}>
      <article
        className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] border border-line bg-card p-5 shadow-[var(--shadow)] lg:rounded-[28px] lg:p-6"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            {concert.productionName && (
              <div className="mb-1 text-[10px] font-black uppercase tracking-[1.6px] text-[var(--acc)]">{concert.productionName}</div>
            )}
            <h2 className="text-2xl font-black tracking-tight">{concert.artistName || concert.title}</h2>
            {concert.artistName && concert.title && concert.title !== concert.artistName && (
              <p className="mt-1 text-[14px] font-semibold text-dim">{concert.title}</p>
            )}
          </div>
          <button onClick={onClose} aria-label="Close concert" className="rounded-xl border border-line p-2 text-dim hover:text-txt">
            <X size={18} />
          </button>
        </div>

        <dl className="space-y-4">
          <div>
            <dt className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-dim2">When</dt>
            <dd className="mt-1 text-[15px] font-bold text-txt">
              {concert.date}{concert.startTime ? ` · ${formatTime(concert.startTime)}` : ""}
            </dd>
          </div>
          <div>
            <dt className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-dim2">Venue</dt>
            <dd className="mt-1 flex items-start gap-2 text-[15px] font-bold text-txt">
              <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--acc)]" />
              <span>{concert.venueName}{concert.venueCity ? ` · ${concert.venueCity}` : ""}</span>
            </dd>
          </div>
          {concert.conductorName && (
            <div>
              <dt className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-dim2">Conductor</dt>
              <dd className="mt-1 text-[15px] font-bold text-txt">{concert.conductorName}</dd>
            </div>
          )}
        </dl>

        <div className="mt-6 flex flex-wrap gap-2">
          <a
            href={mapsUrl(concert.location.lat, concert.location.lng)}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-card2 px-4 py-2.5 text-[13px] font-extrabold text-txt"
          >
            <Navigation size={15} /> Directions
          </a>
          {concert.ticketing?.ticketUrl && (
            <a
              href={concert.ticketing.ticketUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-acc px-4 py-2.5 text-[13px] font-extrabold text-on-acc"
            >
              <Ticket size={15} /> Tickets
            </a>
          )}
        </div>
      </article>
    </div>
  );
}
