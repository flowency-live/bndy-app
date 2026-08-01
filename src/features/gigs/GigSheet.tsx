"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, MapPin, Navigation, Ticket, User } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { TicketStub } from "@/components/TicketStub";
import { Avatar } from "@/components/ui/Avatar";
import { useArtistImageMap } from "@/lib/hooks";
import { prettyDate, formatTime } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { cn } from "@/lib/cn";
import type { Gig } from "@/domain/types";

function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }

/**
 * Gig detail sheet. Optional `stack`: same-venue gigs within the active filter —
 * map pins at one venue overlap exactly, so a tap surfaces the whole deck as a
 * swipeable snap carousel (next card peeks in from the right as the affordance).
 * Single-gig callers (lists, profiles) are untouched.
 */
export function GigSheet({ gig, distance, onClose, stack, distanceOf }: {
  gig: Gig | null;
  distance?: number;
  onClose: () => void;
  stack?: Gig[] | null;
  distanceOf?: (g: Gig) => number | undefined;
}) {
  const imgMap = useArtistImageMap();
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const multi = !!gig && !!stack && stack.length > 1;

  // new deck → rewind to the first (soonest) card
  const stackKey = multi ? `${stack![0].id}:${stack!.length}` : null;
  useEffect(() => {
    setIdx(0);
    scrollRef.current?.scrollTo({ left: 0 });
  }, [stackKey]);

  const goTo = (i: number) => {
    if (!stack) return;
    const clamped = Math.max(0, Math.min(stack.length - 1, i));
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: (el.scrollWidth / stack.length) * clamped, behavior: "smooth" });
    setIdx(clamped);
  };

  // desktop: arrow keys page the deck (mouse users can't horizontal-scroll)
  useEffect(() => {
    if (!multi) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goTo(idx + 1);
      else if (e.key === "ArrowLeft") goTo(idx - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [multi, idx, stackKey]);

  return (
    <Sheet open={!!gig} onClose={onClose}>
      {gig && !multi && (
        <Body gig={gig} distance={distance} src={gig.artistId ? imgMap.get(gig.artistId) : undefined} onClose={onClose} />
      )}
      {gig && multi && (
        <>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="truncate text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">
              {stack!.length} gigs {stack![0].venueName ? `at ${stack![0].venueName}` : "at this venue"}
            </span>
            <span className="tnum shrink-0 pl-3 text-[11px] font-bold text-dim2">{idx + 1} / {stack!.length}</span>
          </div>
          <div className="relative">
            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                const i = Math.round(el.scrollLeft / (el.scrollWidth / stack!.length));
                if (i !== idx && i >= 0 && i < stack!.length) setIdx(i);
              }}
              className="no-scrollbar -mx-5 flex snap-x snap-mandatory gap-3 overflow-x-auto px-5"
            >
              {stack!.map((g) => (
                <div
                  key={g.id}
                  className="w-[86%] shrink-0 snap-center rounded-2xl border border-line p-4"
                  style={{ background: "color-mix(in srgb, var(--card2) 45%, transparent)" }}
                >
                  <Body gig={g} distance={distanceOf?.(g)} src={g.artistId ? imgMap.get(g.artistId) : undefined} onClose={onClose} />
                </div>
              ))}
            </div>
            {/* desktop chevrons — mouse users have no horizontal scroll; touch swipes */}
            <button
              onClick={() => goTo(idx - 1)}
              disabled={idx === 0}
              aria-label="Previous gig"
              className="absolute -left-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line-hi glass-hi shadow-lg transition-opacity disabled:opacity-25 lg:flex"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(idx + 1)}
              disabled={idx === stack!.length - 1}
              aria-label="Next gig"
              className="absolute -right-3 top-1/2 z-10 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-line-hi glass-hi shadow-lg transition-opacity disabled:opacity-25 lg:flex"
            >
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="mt-3 flex justify-center gap-1.5">
            {stack!.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                aria-label={`Gig ${i + 1} of ${stack!.length}`}
                className={cn("h-1.5 rounded-full transition-all duration-300", i === idx ? "w-5" : "w-1.5")}
                style={{ background: i === idx ? "var(--acc)" : "color-mix(in srgb, var(--dim2) 45%, transparent)" }}
              />
            ))}
          </div>
        </>
      )}
    </Sheet>
  );
}

function Body({ gig, distance, src, onClose }: { gig: Gig; distance?: number; src?: string; onClose: () => void }) {
  const tonight = prettyDate(gig.date) === "Tonight";
  return (
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
        {gig.ticketed && <TicketStub onCard price={gig.ticketing?.price} className="self-center" />}
      </div>

      {gig.ticketed && gig.ticketUrl && (
        <a href={gig.ticketUrl} target="_blank" rel="noopener noreferrer"
          className="bndy-btn mb-2.5 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
          <Ticket size={16} /> Get tickets
        </a>
      )}
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
  );
}
