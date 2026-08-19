"use client";

// The festival map tab. All rendering lives in FilteredMapView, which is the
// main map's venue mode over an explicit venue set - the same component
// Editions (feature 16) consumes later. This file only assembles the set.
//
// WHY THE SYNTHETIC VENUES. A festival can reference a venue the public
// venues cache has not loaded yet, but its gigs still carry verified
// coordinates. A gig-built stand-in keeps that venue on the map instead of
// silently dropping it. Identity fields are display-only here; nothing writes.

import { useMemo } from "react";
import { MapPin } from "lucide-react";
import type { Festival, Gig, Venue } from "@/domain/types";
import { useVenues } from "@/lib/hooks";
import { FilteredMapView } from "@/features/map/FilteredMapView";

export function FestivalMap({ festival, gigs }: { festival: Festival; gigs: Gig[] }) {
  const { data: allVenues = [] } = useVenues();

  const venues = useMemo<Venue[]>(() => {
    const ids = new Set([...festival.venueIds, ...gigs.map((g) => g.venueId)]);
    const byId = new Map(allVenues.map((v) => [v.id, v]));
    const out: Venue[] = [];
    for (const id of ids) {
      const known = byId.get(id);
      if (known) { out.push(known); continue; }
      const fallback = gigs.find((g) => g.venueId === id && g.location);
      if (!fallback) continue; // no coordinates from anywhere: cannot be mapped
      out.push({
        id,
        name: fallback.venueName || "Festival venue",
        city: fallback.venueCity,
        location: fallback.location,
      } as Venue);
    }
    return out;
  }, [festival.venueIds, gigs, allVenues]);

  if (!venues.length) {
    return (
      <div className="rounded-[var(--rad-lg)] border border-line bg-card p-8 text-center">
        <MapPin size={28} className="mx-auto text-[var(--acc)]" />
        <h2 className="mt-3 text-xl font-black">Venue map coming soon.</h2>
        <p className="mt-2 text-[13px] font-semibold text-dim">This festival does not have mapped participating venues yet.</p>
      </div>
    );
  }

  return <FilteredMapView venues={venues} gigs={gigs} badge="Festival map" />;
}
