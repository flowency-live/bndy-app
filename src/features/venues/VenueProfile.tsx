import Link from "next/link";
import { MapPin, Navigation, Globe, Building2, Plus } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { HeroBack, HeroSocials } from "@/features/artists/HeroControls";
import { VenueEvents } from "./VenueEvents";
import { VenueTicketingBanner } from "./VenueTicketingBanner";
import { FavouriteButton } from "@/features/shared/FavouriteButton";
import { CuratorBar } from "@/features/curator/CuratorBar";
import { AvatarUpload } from "@/features/curator/AvatarUpload";
import { FlagButton } from "@/features/shared/FlagButton";
import { safeHref } from "@/lib/safeHref";
import type { Gig, Venue } from "@/domain/types";

function gmaps(lat: number, lng: number) { return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`; }

export function VenueProfile({ id, venue, gigs }: { id: string; venue: Venue | null; gigs: Gig[] }) {
  const name = venue?.name || gigs[0]?.venueName || "Venue";
  const img = venue?.profileImageUrl || undefined;
  const loc = venue?.location;
  const website = venue?.socials?.find((s) => s.platform === "website")?.url || venue?.website;

  return (
    <div className="pb-24 lg:pb-12">
      {/* ---- header (Jason 2026-08-11): no landscape hero, ever. One compact
           layout — a LARGE square avatar on the left (the profile image when
           there is one), name block beside it, controls on the right. ---- */}
      <div className="mx-auto max-w-content px-4 pt-3 lg:px-8 lg:pt-5">
        <div className="flex items-center justify-between">
          <HeroBack inline />
          <HeroSocials socials={venue?.socials} name={name} inline />
        </div>
        <div className="mt-4 flex items-start gap-4">
          <div className="shrink-0">
            <span className="hidden lg:block"><Avatar id={id} name={name} src={img} size={132} radius={26} icon={<Building2 size={48} />} /></span>
            <span className="lg:hidden"><Avatar id={id} name={name} src={img} size={96} radius={22} icon={<Building2 size={36} />} /></span>
          </div>
          <div className="min-w-0 pt-1">
            <span className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[var(--acc2)] bg-card2 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-[var(--acc2)]">
              <MapPin size={11} /> Live music venue
            </span>
            <h1 className="truncate text-[26px] font-black leading-none tracking-tight lg:text-4xl">{name}</h1>
            {(venue?.city || venue?.address) && (
              <div className="mt-1.5 flex items-center gap-1 truncate text-[13px] font-bold text-cyan">
                <MapPin size={13} className="shrink-0" /> <span className="truncate">{venue?.city || venue?.address}</span>
              </div>
            )}
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-2 pt-1">
            <AvatarUpload type="venue" id={id} className="h-10 w-10 rounded-xl" />
            <FavouriteButton type="venue" id={id} name={name} size={20} className="h-10 w-10 rounded-xl" />
            <FlagButton type="venue" id={id} name={name} size={18} className="h-10 w-10 rounded-xl" />
          </div>
        </div>
      </div>

      {/* ---- body ---- */}
      <div className="mx-auto max-w-content px-4 lg:px-8">
        {venue && <CuratorBar target={{ kind: "venue", venue }} className="mt-4" />}
        <div className="mt-4 flex max-w-md gap-2.5">
          {loc && (
            <a href={gmaps(loc.lat, loc.lng)} target="_blank" rel="noopener"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-b from-orange to-orange/80 py-3 text-[13.5px] font-extrabold text-[#120a04] shadow-[0_6px_22px_rgba(255,122,26,.4)] transition-transform active:scale-[.97]">
              <Navigation size={16} /> Directions
            </a>
          )}
          {safeHref(website) && (
            <a href={safeHref(website)} target="_blank" rel="noopener noreferrer"
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-white/5 py-3 text-[13.5px] font-extrabold transition-transform active:scale-[.97]">
              <Globe size={16} /> Website
            </a>
          )}
          <Link href={`/add?venueId=${id}`}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-line bg-white/5 py-3 text-[13.5px] font-extrabold transition-transform active:scale-[.97]">
            <Plus size={16} className="text-[var(--acc)]" /> Add a gig
          </Link>
        </div>
        {venue?.address && (
          <div className="mt-3 flex items-center gap-2 text-[13.5px] font-medium text-dim">
            <MapPin size={15} className="shrink-0 opacity-60" /> {venue.address}
          </div>
        )}
        <VenueTicketingBanner venue={venue} />
        <VenueEvents venueId={id} />
      </div>
    </div>
  );
}
