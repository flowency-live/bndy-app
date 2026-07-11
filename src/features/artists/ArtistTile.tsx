"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { avatarGradient, initials } from "@/domain/avatar";
import type { Artist } from "@/domain/types";

export const ArtistTile = memo(function ArtistTile({ artist, gigging }: { artist: Artist; gigging?: boolean }) {
  const [failed, setFailed] = useState(false);
  const showImg = !!artist.profileImageUrl && !failed;
  const act = artist.actType?.[0];

  return (
    <Link href={`/artists/${artist.id}`} className="bndy-card group relative block aspect-square overflow-hidden rounded-xl border border-line bg-card">
      {showImg ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artist.profileImageUrl!}
          alt={artist.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: avatarGradient(artist.id) }}>
          <span className="text-[clamp(22px,6vw,34px)] font-black text-white/95 drop-shadow-[0_2px_10px_rgba(0,0,0,.35)]">{initials(artist.name)}</span>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3/5 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

      {gigging && <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-[var(--acc2)] shadow-[0_0_8px_var(--acc2)]" aria-label="Gigging soon" />}

      <div className="absolute inset-x-0 bottom-0 p-2">
        {act && (
          <span className="mb-0.5 inline-block rounded bg-black/45 px-1.5 py-0.5 text-[8px] font-extrabold uppercase tracking-wide text-white/85 backdrop-blur-sm">
            {act}
          </span>
        )}
        <div className="truncate text-[12.5px] font-black leading-tight text-white [text-shadow:0_1px_5px_rgba(0,0,0,.85)]">{artist.name}</div>
      </div>
    </Link>
  );
});
