"use client";

import { useState } from "react";
import { useGeolocation } from "@/lib/useGeolocation";
import { useArtistImageMap } from "@/lib/hooks";
import { distanceMiles } from "@/domain/geo";
import { todayISO } from "@/domain/dates";
import { GigCard } from "@/features/gigs/GigCard";
import { GigSheet } from "@/features/gigs/GigSheet";
import type { Gig } from "@/domain/types";

export function ProfileGigList({ gigs, loading }: { gigs: Gig[]; loading?: boolean }) {
  const { location } = useGeolocation();
  const imgMap = useArtistImageMap();
  const [selected, setSelected] = useState<Gig | null>(null);
  const today = todayISO();

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl border border-line bg-card" />)}
      </div>
    );
  }
  if (!gigs.length) return <p className="py-8 text-center font-semibold text-dim">No upcoming gigs listed.</p>;

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {gigs.map((g) => (
          <GigCard key={g.id} gig={g} imageUrl={g.artistId ? imgMap.get(g.artistId) : undefined} distance={distanceMiles(location, g.location)} tonight={g.date === today} onClick={() => setSelected(g)} />
        ))}
      </div>
      <GigSheet gig={selected} distance={selected ? distanceMiles(location, selected.location) : undefined} onClose={() => setSelected(null)} />
    </>
  );
}
