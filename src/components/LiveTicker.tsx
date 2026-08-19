"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { addDaysISO, todayISO } from "@/domain/dates";
import type { Gig, Venue } from "@/domain/types";

/**
 * Global marquee, but cache-only.
 *
 * AppShell mounts this on every route, so the ticker must never be the reason
 * we download the full gig/venue catalogues. These disabled observers use the
 * exact shared query keys: when another screen has already loaded the data the
 * ticker updates with live counts; otherwise it keeps useful brand copy.
 */
export function LiveTicker() {
  const today = todayISO();
  const endDate = addDaysISO(today, 730);

  const { data: gigs } = useQuery<Gig[]>({
    queryKey: ["gigs", "upcoming", today, endDate],
    queryFn: async () => [],
    enabled: false,
    staleTime: Infinity,
  });
  const { data: venues } = useQuery<Venue[]>({
    queryKey: ["venues"],
    queryFn: async () => [],
    enabled: false,
    staleTime: Infinity,
  });

  const row = useMemo(() => {
    const tonight = gigs?.filter((g) => g.date === today).length;
    const parts = [
      "KEEPING LIVE MUSIC ALIVE",
      typeof tonight === "number"
        ? (tonight > 0 ? `${tonight} GIG${tonight === 1 ? "" : "S"} TONIGHT` : "FIND YOUR NEXT GIG")
        : "DISCOVER GRASSROOTS GIGS",
      venues?.length ? `${venues.length} VENUES` : "SUPPORT LOCAL VENUES",
      gigs?.length ? `${gigs.length} GIGS LISTED` : "FIND YOUR NEXT GIG",
    ];
    return parts.join(" ★ ") + " ★ ";
  }, [gigs, venues, today]);

  const doubled = row.repeat(2);
  return (
    <div className="bndy-ticker" aria-hidden="true">
      <div className="bndy-ticker-in">
        <span>{doubled}</span><span>{doubled}</span>
      </div>
    </div>
  );
}
