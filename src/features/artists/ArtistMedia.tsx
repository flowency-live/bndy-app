"use client";

import { useMemo, useState } from "react";
import { ExternalLink, Headphones, Music2, Play, Youtube } from "lucide-react";
import { safeHref } from "@/lib/safeHref";
import { artistMedia, type ArtistMediaItem, type MediaProvider } from "./media";
import type { SocialLink } from "@/domain/types";

const DETAILS: Record<MediaProvider, { label: string; action: string; Icon: typeof Music2; wash: string }> = {
  youtube: { label: "YouTube", action: "Load video", Icon: Youtube, wash: "from-red-500/30 via-fuchsia-500/10 to-black/60" },
  spotify: { label: "Spotify", action: "Load player", Icon: Music2, wash: "from-emerald-500/30 via-cyan-500/10 to-black/60" },
  soundcloud: { label: "SoundCloud", action: "Load player", Icon: Headphones, wash: "from-orange-500/35 via-pink-500/10 to-black/60" },
  bandcamp: { label: "Bandcamp", action: "Open Bandcamp", Icon: Music2, wash: "from-cyan-500/30 via-blue-500/10 to-black/60" },
};

export function ArtistMedia({ socials, artistName }: { socials?: SocialLink[]; artistName: string }) {
  const items = useMemo(() => artistMedia(socials), [socials]);
  const [loaded, setLoaded] = useState<Set<MediaProvider>>(() => new Set());
  if (items.length === 0) return null;

  const load = (provider: MediaProvider) => setLoaded((current) => new Set(current).add(provider));

  return (
    <section className="mt-7" aria-labelledby="artist-media-title">
      <div className="mb-3 flex items-end justify-between gap-4">
        <div>
          <div className="font-meta text-[9px] font-black uppercase tracking-[1.7px] text-[var(--acc-text)]">Artist media</div>
          <h2 id="artist-media-title" className="font-disp mt-1 text-[25px] font-black leading-none tracking-tight">Listen and watch.</h2>
        </div>
        <span className="hidden text-[10.5px] font-semibold text-dim sm:block">Players load only when you choose</span>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item, index) => (
          <MediaCard
            key={item.provider}
            item={item}
            artistName={artistName}
            loaded={loaded.has(item.provider)}
            onLoad={() => load(item.provider)}
            featured={items.length === 1 || (index === 0 && item.provider === "youtube")}
          />
        ))}
      </div>
    </section>
  );
}

function MediaCard({ item, artistName, loaded, onLoad, featured }: {
  item: ArtistMediaItem;
  artistName: string;
  loaded: boolean;
  onLoad: () => void;
  featured: boolean;
}) {
  const detail = DETAILS[item.provider];
  const { Icon } = detail;
  const canEmbed = Boolean(item.embedUrl);
  const youtubeThumb = item.videoId ? `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg` : null;
  const height = item.provider === "youtube" ? undefined : item.provider === "spotify" ? 352 : item.provider === "soundcloud" ? 166 : 300;

  return (
    <article className={`overflow-hidden rounded-[22px] border border-line bg-card shadow-[var(--shadow)] ${featured ? "md:col-span-2" : ""}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2 text-[11px] font-black uppercase tracking-[1px]">
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/5 text-[var(--acc)]"><Icon size={14} /></span>
          <span>{detail.label}</span>
        </div>
        <a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer" className="flex min-h-8 items-center gap-1.5 rounded-full px-2.5 text-[10.5px] font-bold text-dim transition hover:bg-white/5 hover:text-txt">
          Open <ExternalLink size={12} />
        </a>
      </div>

      {loaded && item.embedUrl ? (
        <div className={item.provider === "youtube" ? "aspect-video bg-black" : "bg-black/5"}>
          <iframe
            src={item.embedUrl}
            title={`${artistName} on ${detail.label}`}
            width="100%"
            height={height}
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            className="block w-full border-0"
          />
        </div>
      ) : canEmbed ? (
        <button
          type="button"
          onClick={onLoad}
          className={`group relative flex w-full items-center justify-center overflow-hidden bg-gradient-to-br ${detail.wash} ${item.provider === "youtube" ? "aspect-video min-h-[190px]" : "min-h-[150px]"}`}
          aria-label={`${detail.action} for ${artistName} on ${detail.label}`}
        >
          {youtubeThumb && (
            <span className="absolute inset-0 bg-cover bg-center opacity-75 transition duration-500 group-hover:scale-[1.025] group-hover:opacity-90" style={{ backgroundImage: `url(${youtubeThumb})` }} />
          )}
          <span className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/10" />
          <span className="relative flex flex-col items-center gap-3 px-6 text-white">
            <span className="grid h-14 w-14 place-items-center rounded-full border border-white/35 bg-black/45 shadow-xl backdrop-blur-md transition group-hover:scale-105 group-hover:bg-black/60">
              <Play size={21} className="ml-1 fill-current" />
            </span>
            <span className="text-[12px] font-black uppercase tracking-[1.4px]">{detail.action}</span>
            <span className="text-[10.5px] font-semibold text-white/70">No autoplay</span>
          </span>
        </button>
      ) : (
        <a href={safeHref(item.url)} target="_blank" rel="noopener noreferrer" className={`group flex min-h-[140px] items-center justify-between gap-5 bg-gradient-to-br ${detail.wash} px-5 py-6 text-white`}>
          <span>
            <span className="block text-[10px] font-black uppercase tracking-[1.4px] text-white/65">Hear {artistName}</span>
            <span className="mt-1 block text-[21px] font-black tracking-tight">{detail.action}</span>
          </span>
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full border border-white/25 bg-black/25 transition group-hover:scale-105"><ExternalLink size={18} /></span>
        </a>
      )}
    </article>
  );
}
