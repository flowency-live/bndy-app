"use client";

import Link from "next/link";
import { memo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { avatarGradient, initials } from "@/domain/avatar";
import { FavouriteButton } from "@/features/shared/FavouriteButton";
import type { Artist } from "@/domain/types";

/** onDelete: pre-launch cleanup only — hard-deletes the artist + all its events. Remove the prop wiring before public launch. */
export const ArtistTile = memo(function ArtistTile({ artist, gigging, onDelete }: { artist: Artist; gigging?: boolean; onDelete?: (artist: Artist) => Promise<unknown> }) {
  const [failed, setFailed] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errored, setErrored] = useState(false);
  const showImg = !!artist.profileImageUrl && !failed;
  const act = artist.actType?.[0];

  const stop = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); };
  const doDelete = async (e: React.MouseEvent) => {
    stop(e);
    setBusy(true); setErrored(false);
    try {
      await onDelete!(artist); // parent removes the tile from cache on success
    } catch (err) {
      console.error("[bndy] artist delete failed:", err);
      setBusy(false); setErrored(true); setConfirming(false);
    }
  };

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

      {!onDelete && <FavouriteButton type="artist" id={artist.id} name={artist.name} className="absolute left-1.5 top-1.5 z-10" size={13} />}

      {onDelete && !confirming && !busy && (
        <button
          onClick={(e) => { stop(e); setConfirming(true); }}
          aria-label={`Delete ${artist.name}`}
          className="absolute left-1.5 top-1.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/55 text-white/80 backdrop-blur-sm transition-colors hover:bg-red-600/90 hover:text-white"
        >
          <Trash2 size={13} />
        </button>
      )}

      {(confirming || busy) && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-2 bg-black/80 p-2 text-center backdrop-blur-sm" onClick={stop}>
          {busy ? (
            <Loader2 size={20} className="animate-spin text-white/90" />
          ) : (
            <>
              <span className="text-[11px] font-extrabold leading-tight text-white">Delete “{artist.name}” + ALL its events?</span>
              <div className="flex gap-1.5">
                <button onClick={doDelete} className="rounded-md bg-red-600 px-2.5 py-1.5 text-[11px] font-black uppercase text-white hover:bg-red-500">Delete</button>
                <button onClick={(e) => { stop(e); setConfirming(false); }} className="rounded-md bg-white/15 px-2.5 py-1.5 text-[11px] font-black uppercase text-white hover:bg-white/25">Keep</button>
              </div>
            </>
          )}
        </div>
      )}

      <div className="absolute inset-x-0 bottom-0 p-2">
        {errored && <span className="mb-0.5 block text-[9px] font-extrabold uppercase text-red-400">Delete failed — retry</span>}
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
