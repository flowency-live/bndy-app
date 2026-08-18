"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Mic, Navigation, Share2, User } from "lucide-react";
import { avatarGradient, initials } from "@/domain/avatar";
import { prettyDate, formatTime, isTonight, setTimeLabel } from "@/domain/dates";
import { gigDisplayName } from "@/domain/gigName";
import { AddToCalendarButton } from "@/features/gigs/AddToCalendarButton";
import { FestivalRibbon } from "@/features/festivals/FestivalRibbon";
import { CuratorBar } from "@/features/curator/CuratorBar";
import { FlagButton } from "@/features/shared/FlagButton";
import { ShareSheet } from "@/features/shared/ShareSheet";
import { TicketStub } from "@/components/TicketStub";
import type { Gig } from "@/domain/types";

function gmaps(lat: number, lng: number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
}

export function GigPageClient({ gig, imageUrl }: { gig: Gig; imageUrl?: string }) {
  const [sharing, setSharing] = useState(false);
  const name = gigDisplayName(gig);
  const tonight = isTonight(gig.date, gig.startTime);
  const time = setTimeLabel(gig.startTime, gig.endTime);

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/g/${gig.id}` : `/g/${gig.id}`;
  const shareText = `${name} at ${gig.venueName}${gig.venueCity ? `, ${gig.venueCity}` : ""} · ${prettyDate(gig.date, gig.startTime)}${gig.startTime ? ` · ${formatTime(gig.startTime)}` : ""}${gig.festivalName ? ` · ${gig.festivalName}` : ""} · found on bndy`;

  return (
    <div className="mx-auto max-w-xl px-4 pb-24 pt-[calc(env(safe-area-inset-top,0px)+16px)] lg:pb-12 lg:pt-8">
      {gig.festivalName && <FestivalRibbon name={gig.festivalName} slug={gig.festivalSlug} className="mb-3" />}

      <div className="relative mb-4 h-52 overflow-hidden rounded-2xl border border-line">
        <div className={gig.cancelled ? "h-full w-full opacity-60 saturate-0" : "h-full w-full"}>
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={name} referrerPolicy="no-referrer" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center" style={{ background: avatarGradient(gig.artistId || gig.venueId) }}>
              <span className="text-[52px] font-black text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">{initials(name)}</span>
            </div>
          )}
        </div>
        {gig.cancelled && (
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-6 rounded-md border-[3px] border-red-500 bg-black/60 px-5 py-1.5 text-[22px] font-black uppercase tracking-[4px] text-red-500 shadow-xl">
            Cancelled
          </span>
        )}
        <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {tonight && !gig.cancelled && (
            <span className="rounded-lg bg-acc px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[1.2px] text-on-acc shadow-lg">Tonight</span>
          )}
          {gig.isOpenMic && (
            <span className="flex items-center gap-1 rounded-lg bg-acc2 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-[1.2px] text-on-acc2 shadow-lg"><Mic size={11} strokeWidth={2.75} /> Open mic</span>
          )}
        </div>
        {gig.ticketed && !gig.cancelled && <TicketStub onCard className="absolute right-3 top-3 shadow-lg" />}
      </div>

      <h1 className="text-[26px] font-black leading-tight tracking-tight lg:text-3xl">{name}</h1>
      <p className="mt-1 flex items-center gap-1.5 text-[14px] font-bold text-dim">
        <MapPin size={14} className="shrink-0" />
        {gig.venueName}
        {gig.venueCity ? ` · ${gig.venueCity}` : ""}
      </p>
      <p className="mt-2 text-[15px] font-extrabold text-[var(--acc)]">
        {prettyDate(gig.date, gig.startTime)}
        {time ? ` · ${time.value}` : ""}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <AddToCalendarButton gig={gig} />
        <button type="button" onClick={() => setSharing(true)} className="flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt">
          <Share2 size={13} className="text-[var(--acc2)]" /> Share
        </button>
        <CuratorBar target={{ kind: "gig", gig }} />
        <FlagButton type="event" id={gig.id} name={name} size={15} className="ml-auto h-[34px] w-[34px] rounded-xl border border-line glass bg-transparent text-dim hover:text-txt" />
      </div>

      <div className="mt-5 flex gap-2.5">
        {gig.artistId && (
          <Link href={`/artists/${gig.artistId}`} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
            <User size={16} /> Artist
          </Link>
        )}
        <Link href={`/venues/${gig.venueId}`} className="bndy-btn2 flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] transition-transform active:scale-[.97]">
          <MapPin size={16} /> Venue
        </Link>
        <a href={gmaps(gig.location.lat, gig.location.lng)} target="_blank" rel="noopener" className="bndy-btn2 flex w-[54px] shrink-0 items-center justify-center py-3.5 transition-transform active:scale-[.97]" aria-label="Directions">
          <Navigation size={16} />
        </a>
      </div>

      <ShareSheet open={sharing} onClose={() => setSharing(false)} url={shareUrl} title="Share this gig" text={shareText} />
    </div>
  );
}
