import { MapPin, Navigation, Globe, Building2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { avatarGradient } from "@/domain/avatar";
import { HeroBack, HeroSocials } from "@/features/artists/HeroControls";
import { VenueEvents } from "./VenueEvents";
import type { Gig, Venue } from "@/domain/types";

function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }

export function VenueProfile({ id, venue, gigs }: { id: string; venue: Venue | null; gigs: Gig[] }) {
  const name = venue?.name || gigs[0]?.venueName || "Venue";
  const img = venue?.profileImageUrl || undefined;
  const loc = venue?.location;
  const website = venue?.socials?.find((s) => s.platform === "website")?.url || venue?.website;

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
        <HeroSocials socials={venue?.socials} name={name} />

        <div className="absolute inset-x-0 bottom-0">
          <div className="mx-auto flex max-w-content items-end gap-3.5 px-4 pb-4 lg:px-8 lg:pb-6">
            <div className="shrink-0 rounded-[22px] ring-2 ring-white/70">
              <Avatar id={id} name={name} src={img} size={86} radius={20} icon={<Building2 size={34} />} />
            </div>
            <div className="min-w-0 pb-1">
              <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--acc2)] bg-card2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc2)]">
                <MapPin size={11} /> Live music venue
              </span>
              <h1 className="truncate text-[26px] font-black leading-none tracking-tight text-white [text-shadow:0_1px_8px_rgba(0,0,0,.6)] lg:text-4xl">{name}</h1>
              {(venue?.city || venue?.address) && (
                <div className="mt-1.5 flex items-center gap-1 truncate text-[13px] font-bold text-cyan">
                  <MapPin size={13} className="shrink-0" /> <span className="truncate">{venue?.city || venue?.address}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="mx-auto max-w-content px-4 lg:px-8">
        <div className="mt-4 flex max-w-md gap-2.5">
          {loc && (
            <a href={gmaps(loc.lat, loc.lng)} target="_blank" rel="noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange to-orange/80 py-3 text-[13.5px] font-extrabold text-[#120a04] shadow-[0_6px_22px_rgba(255,122,26,.4)] transition-transform active:scale-[.97]">
              <Navigation size={16} /> Directions
            </a>
          )}
          {website && (
            <a href={website} target="_blank" rel="noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-white/5 py-3 text-[13.5px] font-extrabold transition-transform active:scale-[.97]">
              <Globe size={16} /> Website
            </a>
          )}
        </div>
        {venue?.address && (
          <div className="mt-3 flex items-center gap-2 text-[13.5px] font-medium text-dim">
            <MapPin size={15} className="shrink-0 opacity-60" /> {venue.address}
          </div>
        )}
        <VenueEvents venueId={id} />
      </div>
    </div>
  );
}
