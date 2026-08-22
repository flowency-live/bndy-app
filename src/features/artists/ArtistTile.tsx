"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { avatarGradient, initials } from "@/domain/avatar";
import { FavouriteButton } from "@/features/shared/FavouriteButton";
import type { Artist } from "@/domain/types";

export const ArtistTile = memo(function ArtistTile({
  artist,
  gigging,
  hrefBase = "/artists",
  activeLabel = "Gigging soon",
}: {
  artist: Artist;
  gigging?: boolean;
  hrefBase?: string;
  activeLabel?: string;
}) {
  const [failed, setFailed] = useState(false);
  const showImg = !!artist.profileImageUrl && !failed;
  const act = artist.actType?.[0];

  return (
    <div className="bndy-card group relative aspect-square overflow-hidden rounded-xl border border-line bg-card">
      <Link href={`${hrefBase}/${artist.id}`} aria-label={`View ${artist.name}`} className="absolute inset-0 z-0 block">
        {showImg ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={artist.profileImageUrl!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFailed(true)}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden" style={{ background: avatarGradient(artist.id) }}>
            <span aria-hidden="true" className="absolute inset-0 bg-black/20" />
            <span className="relative z-10 text-[clamp(22px,6vw,34px)] font-black text-white drop-shadow-[0_2px_5px_rgba(0,0,0,.95)]">{initials(artist.name)}</span>
          </div>
        )}

        <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

        {gigging && (
          <>
            <span aria-hidden="true" className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full border border-black/40 bg-[var(--acc2)] shadow-[0_0_8px_var(--acc2)]" />
            <span className="sr-only">{activeLabel}</span>
          </>
        )}

        <span className="absolute inset-x-0 bottom-0 p-2">
          {act && (
            <span className="mb-0.5 inline-block rounded bg-black/75 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white backdrop-blur-sm">
              {act}
            </span>
          )}
          <span className="block truncate text-[12.5px] font-black leading-tight text-white [text-shadow:0_1px_5px_rgba(0,0,0,.95)]">{artist.name}</span>
        </span>
      </Link>

      <FavouriteButton type="artist" id={artist.id} name={artist.name} className="absolute left-1.5 top-1.5 z-10" size={13} />
    </div>
  );
});
