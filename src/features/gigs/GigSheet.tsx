"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, MapPin, Mic, Navigation, Share2, Ticket, User } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { TicketStub } from "@/components/TicketStub";
import { headlineActs, lineupOf } from "@/domain/lineup";
import { CuratorBar } from "@/features/curator/CuratorBar";
import { FlagButton } from "@/features/shared/FlagButton";
import { AddToCalendarButton } from "./AddToCalendarButton";
import { ShareSheet } from "@/features/shared/ShareSheet";
import { useArtistImageMap, useArtists, useUpcomingGigs, useVenues } from "@/lib/hooks";
import { avatarGradient, initials } from "@/domain/avatar";
import { formatTime, isTonight, setTimeLabel, todayISO } from "@/domain/dates";
import { formatDistance } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { safeHref } from "@/lib/safeHref";
import { DOW, MON } from "@/domain/dates";
import type { Gig } from "@/domain/types";

function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }
function dateParts(iso: string): { dow: string; label: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return { dow: DOW[dow], label: `${d} ${MON[m - 1]}` };
}

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
  // Batch-loaded map events can omit denormalised names — resolve from cached entity lists.
  const { data: artists = [] } = useArtists();
  const { data: venues = [] } = useVenues();
  // Live state join: the sheet holds a SNAPSHOT of the gig from when it was
  // tapped. A cancel/un-cancel invalidates the gigs cache — read the flag
  // back from it so the stamp appears the moment the action completes,
  // without closing and reopening the sheet.
  const { data: liveGigs = [] } = useUpcomingGigs();
  const liveOf = (g: Gig): Gig => {
    const live = liveGigs.find((x) => x.id === g.id);
    return live ? { ...g, cancelled: live.cancelled, isOpenMic: g.isOpenMic ?? live.isOpenMic } : g;
  };
  const hostOf = (g: Gig) => g.artistName || (g.artistId && artists.find((a) => a.id === g.artistId)?.name) || undefined;
  const nameOf = (g: Gig) => {
    if (g.isOpenMic) { const h = hostOf(g); return h ? `Open mic with ${h}` : "Open mic"; }
    return hostOf(g) || g.title;
  };
  const venueOf = (g: Gig) => {
    const venue = venues.find((v) => v.id === g.venueId);
    return {
      name: g.venueName || venue?.name || "",
      city: g.venueCity || venue?.city,
    };
  };

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

  const selectedVenue = gig ? venueOf(gig) : { name: "", city: undefined };
  const stackVenue = multi ? venueOf(stack![0]) : { name: "", city: undefined };

  return (
    <Sheet open={!!gig} onClose={onClose}>
      {gig && !multi && (
        <Body gig={liveOf(gig)} name={nameOf(gig)} venueName={selectedVenue.name} venueCity={selectedVenue.city} distance={distance} src={headlineActs(gig)[0] ? imgMap.get(headlineActs(gig)[0].id) : undefined} onClose={onClose} />
      )}
      {gig && multi && (
        <>
          <div className="mb-2.5 flex items-center justify-between">
            <span className="truncate text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">
              {stack!.length} gigs {stackVenue.name ? `at ${stackVenue.name}` : "at this venue"}
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
              {stack!.map((g) => {
                const venue = venueOf(g);
                return (
                  <div
                    key={g.id}
                    className="w-[86%] shrink-0 snap-center rounded-2xl border border-line p-4"
                    style={{ background: "color-mix(in srgb, var(--card2) 45%, transparent)" }}
                  >
                    <Body gig={liveOf(g)} name={nameOf(g)} venueName={venue.name} venueCity={venue.city} distance={distanceOf?.(g)} src={headlineActs(g)[0] ? imgMap.get(headlineActs(g)[0].id) : undefined} onClose={onClose} />
                  </div>
                );
              })}
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

/** Slab: the framed date/time blocks (accent keyline on top, like a ticket edge). */
function Slab({ label, value, hot }: { label: string; value: string; hot?: boolean }) {
  return (
    <div
      className={cn("min-w-[86px] flex-1 rounded-xl px-3 py-2 text-center sm:flex-none", hot ? "bg-acc text-on-acc" : "bg-card2")}
      style={hot ? undefined : { boxShadow: "inset 0 2.5px 0 var(--acc)" }}
    >
      <div className={cn("text-[9.5px] font-extrabold uppercase tracking-[1.2px]", hot ? "opacity-85" : "text-dim")}>{label}</div>
      <div className="tnum mt-0.5 text-[15px] font-black leading-tight">{value}</div>
    </div>
  );
}

function Body({ gig, name, venueName, venueCity, distance, src, onClose }: { gig: Gig; name: string; venueName: string; venueCity?: string; distance?: number; src?: string; onClose: () => void }) {
  const tonight = isTonight(gig.date, gig.startTime);
  const isToday = gig.date === todayISO();
  const { dow, label } = dateParts(gig.date);
  const time = setTimeLabel(gig.startTime, gig.endTime);
  const [sharing, setSharing] = useState(false);

  // 3b: the gig now has its own URL — share the short /g link, not the profile.
  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/g/${gig.id}` : `/g/${gig.id}`;
  const shareText = `${name}${venueName ? ` at ${venueName}` : ""}${venueCity ? `, ${venueCity}` : ""} · ${dow} ${label}${gig.startTime ? ` · ${formatTime(gig.startTime)}` : ""} · found on bndy`;

  return (
    <>
      {/* hero: big artist image (falls back to the palette gradient + initials) */}
      <div className="relative mb-3.5 h-44 overflow-hidden rounded-2xl border border-line">
        <div className={cn("h-full w-full", gig.cancelled && "opacity-60 saturate-0")}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: avatarGradient(headlineActs(gig)[0]?.id || gig.venueId) }}>
              <span className="text-[44px] font-black text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">{initials(name)}</span>
            </div>
          )}
        </div>
        {/* feature 7: rubber-stamp treatment — unmissable, hero greyed underneath */}
        {gig.cancelled && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-md border-[3px] border-red-500 bg-black/60 px-5 py-1.5 text-[20px] font-black uppercase tracking-[4px] text-red-500 shadow-xl">
            Cancelled
          </span>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {tonight && !gig.cancelled && (
            <span className="rounded-lg bg-acc px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[1.2px] text-on-acc shadow-lg">
              Tonight
            </span>
          )}
          {gig.isOpenMic && (
            <span className="flex items-center gap-1 rounded-lg bg-acc2 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[1.2px] text-on-acc2 shadow-lg">
              <Mic size={11} strokeWidth={2.75} /> Open mic
            </span>
          )}
        </div>
        {gig.ticketed && !gig.cancelled && <TicketStub onCard className="absolute right-3 top-3 shadow-lg" />}
      </div>

      {/* Feature 3a/4/6/7: calendar for everyone; curators edit, cancel, hide; anyone flags */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <AddToCalendarButton gig={gig} />
        <CuratorBar target={{ kind: "gig", gig }} onHidden={onClose} />
        <FlagButton type="event" id={gig.id} name={name} size={15} className="ml-auto h-[34px] w-[34px] rounded-xl border border-line glass bg-transparent text-dim hover:text-txt" />
      </div>

      <div className="text-[22px] font-black leading-tight tracking-tight">{name}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[14px] font-semibold text-dim">
        <MapPin size={13} className="shrink-0 opacity-70" />
        <span className="truncate">
          {venueName ? <>at <span className="font-extrabold text-txt">{venueName}</span></> : "Venue TBC"}
          {venueCity ? ` · ${venueCity}` : ""}
        </span>
      </div>

      {/* Feature 12: the full bill. Headline acts first, then support. Only shown
          when there is more than one act, so a normal gig is unchanged. */}
      {lineupOf(gig).length > 1 && (
        <div className="mt-3 space-y-1">
          {[...lineupOf(gig)].sort((a, b) => Number(b.headline) - Number(a.headline)).map((a) => (
            <Link key={a.id} href={`/artists/${a.id}`} onClick={onClose}
              className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2 transition-colors hover:border-line-hi">
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">{a.name}</span>
              {!a.headline && (
                <span className="shrink-0 rounded-md bg-card2 px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide text-dim">Support</span>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="mb-4 mt-3.5 flex flex-wrap gap-2">
        <Slab label={tonight ? "Tonight" : isToday ? "Today" : dow} value={label} hot={tonight} />
        {time && <Slab label={time.label} value={time.value} />}
        {distance !== undefined && isFinite(distance) && <Slab label="Away" value={formatDistance(distance)} />}
      </div>

      {gig.ticketed && safeHref(gig.ticketUrl) && (
        <a href={safeHref(gig.ticketUrl)} target="_blank" rel="noopener noreferrer"
          className="bndy-btn mb-2.5 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
          <Ticket size={16} /> Get tickets
        </a>
      )}
      <a href={gmaps(gig.location.lat, gig.location.lng)} target="_blank" rel="noopener"
        className="bndy-btn mb-2.5 flex items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
        <Navigation size={16} /> Directions
      </a>
      <div className="flex gap-2.5">
        {lineupOf(gig).length === 1 && headlineActs(gig)[0] && (
          <Link href={`/artists/${headlineActs(gig)[0].id}`} onClick={onClose} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
            <User size={16} /> Artist
          </Link>
        )}
        <Link href={`/venues/${gig.venueId}`} onClick={onClose} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
          <MapPin size={16} /> Venue
        </Link>
        <button
          onClick={() => setSharing(true)}
          aria-label="Share this gig"
          className="bndy-btn2 flex w-[54px] shrink-0 items-center justify-center py-3.5 transition-transform active:scale-[.97]"
        >
          <Share2 size={16} />
        </button>
      </div>

      <ShareSheet open={sharing} onClose={() => setSharing(false)} url={shareUrl} title="Share this gig" text={shareText} />
    </>
  );
}
