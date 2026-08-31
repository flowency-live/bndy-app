"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MapPin, Music2, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { HeroBack, HeroSocials } from "./HeroControls";
import { ArtistEvents } from "./ArtistEvents";
import { ArtistMedia } from "./ArtistMedia";
import { ArtistManagementBar } from "./ArtistManagementBar";
import { ClaimEntityLink } from "@/features/join/ClaimEntityLink";
import { cn } from "@/lib/cn";
import { CuratorBar } from "@/features/curator/CuratorBar";
import { AvatarUpload } from "@/features/curator/AvatarUpload";
import { FlagButton } from "@/features/shared/FlagButton";
import { FavouriteButton } from "@/features/shared/FavouriteButton";
import { artistTypeLabel, useArtistTaxonomy } from "@/lib/artistTaxonomy";
import type { Artist, Gig, ArtistAvailabilityCalendar } from "@/domain/types";

export function ArtistProfile({ id, artist, gigs, pastGigs, availabilityCalendar }: { id: string; artist: Artist | null; gigs: Gig[]; pastGigs: Gig[]; availabilityCalendar: ArtistAvailabilityCalendar }) {
  const [displayArtist, setDisplayArtist] = useState(artist);
  const [displayAvailability, setDisplayAvailability] = useState(availabilityCalendar.availability);
  const [displayAvailabilityStatuses, setDisplayAvailabilityStatuses] = useState(availabilityCalendar.dateStatuses);
  const displayedId = useRef(id);
  useEffect(() => {
    if (displayedId.current === id) return;
    displayedId.current = id;
    setDisplayArtist(artist);
    setDisplayAvailability(availabilityCalendar.availability);
    setDisplayAvailabilityStatuses(availabilityCalendar.dateStatuses);
  }, [artist, availabilityCalendar, id]);
  const { data: taxonomy } = useArtistTaxonomy();
  const name = displayArtist?.name || gigs[0]?.artistName || pastGigs[0]?.artistName || "Artist";
  const img = displayArtist?.profileImageUrl || undefined;
  const type = artistTypeLabel(displayArtist?.artistType, taxonomy);
  const genres = displayArtist?.genres ?? [];

  return (
    <div className="pb-24 lg:pb-12">
      <div className="mx-auto max-w-content px-4 pt-3 lg:px-8 lg:pt-5">
        <div className="flex items-center justify-between">
          <HeroBack inline />
          <HeroSocials socials={displayArtist?.socials} name={name} inline />
        </div>

        <div className="mt-4 grid grid-cols-[96px_minmax(0,1fr)] items-start gap-4 lg:hidden">
          <Avatar id={id} name={name} src={img} size={96} radius={22} />
          <div className="min-w-0 pt-1">
            {type && (
              <span className="inline-flex items-center gap-1.5 rounded-md border border-[var(--acc)] bg-card2 px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-[var(--acc)]">
                <Music2 size={11} /> {type}
              </span>
            )}
            <h1 className="mt-2 text-[28px] font-black leading-[0.98] tracking-tight [overflow-wrap:anywhere]">{name}</h1>
            {displayArtist?.location && (
              <div className="mt-2 flex min-w-0 items-center gap-1.5 text-[13px] font-bold text-[var(--acc)]">
                <MapPin size={13} className="shrink-0" />
                <span className="min-w-0 truncate">{displayArtist.location}</span>
              </div>
            )}
            <div className="mt-3 flex items-center gap-2">
              <AvatarUpload type="artist" id={id} className="h-9 w-9 rounded-xl" />
              <FavouriteButton type="artist" id={id} name={name} size={18} className="h-9 w-9 rounded-xl" />
              <FlagButton type="artist" id={id} name={name} size={17} className="h-9 w-9 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="mt-4 hidden items-start gap-4 lg:flex">
          <div className="shrink-0"><Avatar id={id} name={name} src={img} size={132} radius={26} /></div>
          <div className="min-w-0 pt-1">
            {type && (
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--acc)] bg-card2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">
                <Music2 size={11} /> {type}
              </span>
            )}
            <h1 className="text-4xl font-black leading-none tracking-tight [overflow-wrap:anywhere]">{name}</h1>
            {displayArtist?.location && (
              <div className="mt-1.5 flex min-w-0 items-center gap-1 text-[13px] font-bold text-[var(--acc)]">
                <MapPin size={13} className="shrink-0" />
                <span className="min-w-0 truncate">{displayArtist.location}</span>
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

      <div className="mx-auto max-w-content px-4 lg:px-8">
        {displayArtist && (
          <ClaimEntityLink
            entityType="artist"
            entityId={id}
            entityName={name}
            location={displayArtist.location}
            className="mt-4"
          />
        )}
        {displayArtist && (
          <CuratorBar
            target={{ kind: "artist", artist: displayArtist }}
            className="mt-4"
            onArtistUpdated={setDisplayArtist}
            onAvailabilityUpdated={setDisplayAvailability}
          />
        )}
        {displayArtist && (
          <ArtistManagementBar
            artist={displayArtist}
            onArtistUpdated={setDisplayArtist}
            onAvailabilityUpdated={setDisplayAvailability}
          />
        )}
        {genres.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {genres.map((g, i) => (
              <span key={g} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold capitalize", i === 0 ? "border-[var(--acc)] bg-card2 text-[var(--acc)]" : "border-line text-dim")}>{g}</span>
            ))}
          </div>
        )}
        {displayArtist?.bio && <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-dim">{displayArtist.bio}</p>}

        <ArtistMedia socials={displayArtist?.socials} artistName={name} />

        <Link href={`/add?artistId=${id}`} className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-line bg-white/5 px-4 py-2.5 text-[13px] font-extrabold transition-transform active:scale-[.97]">
          <Plus size={15} className="text-[var(--acc)]" /> Add a gig
        </Link>
        <ArtistEvents gigs={gigs} pastGigs={pastGigs} artistId={id} artist={displayArtist} availability={displayAvailability} availabilityStatuses={displayAvailabilityStatuses} />
      </div>
    </div>
  );
}
