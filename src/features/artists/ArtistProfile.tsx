import { MapPin, Music2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { avatarGradient } from "@/domain/avatar";
import { HeroBack, HeroSocials } from "./HeroControls";
import { ArtistEvents } from "./ArtistEvents";
import { cn } from "@/lib/cn";
import type { Artist, Gig } from "@/domain/types";

export function ArtistProfile({ id, artist, gigs }: { id: string; artist: Artist | null; gigs: Gig[] }) {
  const name = artist?.name || gigs[0]?.artistName || "Artist";
  const img = artist?.profileImageUrl || undefined;
  const type = artist?.artistType;
  const genres = artist?.genres ?? [];

  return (
    <div className="pb-24 lg:pb-12">
      {/* ---- hero ---- */}
      <div className="relative h-[168px] w-full overflow-hidden lg:h-[290px]">
        <div className="absolute inset-0" style={{ background: avatarGradient(id) }} />
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" aria-hidden referrerPolicy="no-referrer" className="absolute inset-0 h-full w-full scale-125 object-cover blur-2xl brightness-[.45] saturate-150" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/55 to-ink/10" />
        <HeroBack />
        <HeroSocials socials={artist?.socials} name={name} />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-content items-end gap-3.5 px-4 pb-4 lg:px-8 lg:pb-6">
            <div className="shrink-0 rounded-[22px] ring-2 ring-white/70">
              <Avatar id={id} name={name} src={img} size={86} radius={20} />
            </div>
            <div className="min-w-0 pb-1">
              {type && (
                <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--acc)] bg-card2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc)]">
                  <Music2 size={11} /> {type}
                </span>
              )}
              <h1 className="truncate text-[26px] font-black leading-none tracking-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,.6)] lg:text-4xl">{name}</h1>
              {artist?.location && (
                <div className="mt-1.5 flex items-center gap-1 text-[13px] font-bold text-cyan">
                  <MapPin size={13} /> {artist.location}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="mx-auto max-w-content px-4 lg:px-8">
        {genres.length > 0 && (
          <div className="no-scrollbar -mx-4 mt-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
            {genres.map((g, i) => (
              <span key={g} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-[12px] font-bold capitalize", i === 0 ? "border-[var(--acc)] bg-card2 text-[var(--acc)]" : "border-line text-dim")}>{g}</span>
            ))}
          </div>
        )}
        {artist?.bio && <p className="mt-4 max-w-2xl text-[14.5px] leading-relaxed text-dim">{artist.bio}</p>}
        <ArtistEvents gigs={gigs} />
      </div>
    </div>
  );
}
