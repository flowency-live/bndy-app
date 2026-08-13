"use client";

import Link from "next/link";
import { useState } from "react";
import { MapPin, Music2, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { HeroBack, HeroSocials } from "./HeroControls";
import { ArtistEvents } from "./ArtistEvents";
import { ArtistAvailability } from "./ArtistAvailability";
import { cn } from "@/lib/cn";
import { CuratorBar } from "@/features/curator/CuratorBar";
import { AvatarUpload } from "@/features/curator/AvatarUpload";
import { FlagButton } from "@/features/shared/FlagButton";
import { FavouriteButton } from "@/features/shared/FavouriteButton";
import type { Artist, Gig, AvailabilityDate } from "@/domain/types";

export function ArtistProfile({ id, artist, gigs, availability }: { id: string; artist: Artist | null; gigs: Gig[]; availability: AvailabilityDate[] }) {
  const [activeTab, setActiveTab] = useState<'events' | 'availability'>('events');
  const name = artist?.name || gigs[0]?.artistName || "Artist";
  const img = artist?.profileImageUrl || undefined;
  const type = artist?.artistType;
  const genres = artist?.genres ?? [];

  return (
    <div className="pb-24 lg:pb-12">
      {/* ---- header (Jason 2026-08-11): no landscape hero, ever. One compact
           layout — a LARGE square avatar on the left (the profile image when
           there is one), name block beside it, controls on the right. ---- */}
      <div className="mx-auto max-w-content px-4 pt-3 lg:px-8 lg:pt-5">
        <div className="flex items-center justify-between">
          <HeroBack inline />
          <HeroSocials socials={artist?.socials} name={name} inline />
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="shrink-0">
            <span className="hidden lg:block"><Avatar id={id} name={name} src={img} size={132} radius={26} /></span>
            <span className="lg:hidden"><Avatar id={id} name={name} src={img} size={96} radius={22} /></span>
          </div>
          <div className="min-w-0 pt-1">
            {type && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--acc)] bg-card2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">
                <Music2 size={11} /> {type}
              </span>
            )}
            <h1 className="truncate text-[26px] font-black leading-none tracking-tight lg:text-4xl">{name}</h1>
            {artist?.location && (
              <div className="mt-1.5 flex items-center gap-1 text-[13px] font-bold text-cyan">
                <MapPin size={13} /> {artist.location}
              </div>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">
            <AvatarUpload type="artist" id={id} className="h-10 w-10 rounded-xl" />
            <FavouriteButton type="artist" id={id} name={name} size={20} className="h-10 w-10 rounded-xl" />
            <FlagButton type="artist" id={id} name={name} size={18} className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="mx-auto max-w-content px-4 lg:px-8">
        {artist && <CuratorBar target={{ kind: "artist", artist }} className="mt-4" />}
        {genres.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {genres.map((g, i) => (
              <span key={g} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold capitalize", i === 0 ? "border-[var(--acc)] bg-card2 text-[var(--acc)]" : "border-line text-dim")}>{g}</span>
            ))}
          </div>
        )}
        {artist?.bio && <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-dim">{artist.bio}</p>}

        <Link href={`/add?artistId=${id}`}
          className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-white/5 px-4 py-2.5 text-[13px] font-extrabold transition-transform active:scale-[.97]">
          <Plus size={15} className="text-[var(--acc)]" /> Add a gig
        </Link>

        {/* ---- tabs (only show if availability is published) ---- */}
        {artist?.publishAvailability && (
          <div className="mt-6 flex gap-1 border-b border-line">
            <button
              onClick={() => setActiveTab('events')}
              className={cn(
                "px-4 py-2.5 text-[14px] font-bold transition-colors",
                activeTab === 'events'
                  ? "border-b-2 border-[var(--acc)] text-[var(--acc)]"
                  : "text-dim hover:text-fg"
              )}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('availability')}
              className={cn(
                "px-4 py-2.5 text-[14px] font-bold transition-colors",
                activeTab === 'availability'
                  ? "border-b-2 border-[var(--acc)] text-[var(--acc)]"
                  : "text-dim hover:text-fg"
              )}
            >
              Availability
            </button>
          </div>
        )}

        {/* ---- content area ---- */}
        {artist?.publishAvailability ? (
          <>
            {activeTab === 'events' ? (
              <ArtistEvents gigs={gigs} artistId={id} />
            ) : (
              <ArtistAvailability artist={artist} availability={availability} />
            )}
          </>
        ) : (
          <ArtistEvents gigs={gigs} artistId={id} />
        )}
      </div>
    </div>
  );
}
