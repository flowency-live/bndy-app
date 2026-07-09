"use client";

// Live marquee ticker — global chrome strip. Prototype: bndy-skins-v4.html .ticker
import { useMemo } from "react";
import { useUpcomingGigs, useVenues } from "@/lib/hooks";
import { todayISO } from "@/domain/dates";

export function LiveTicker() {
  const { data: gigs = [] } = useUpcomingGigs();
  const { data: venues = [] } = useVenues();

  const text = useMemo(() => {
    const today = todayISO();
    const tonight = gigs.filter((g) => g.date === today).length;
    const parts = [
      "KEEPING LIVE MUSIC ALIVE",
      tonight > 0 ? `${tonight} GIG${tonight === 1 ? "" : "S"} TONIGHT` : "FIND YOUR NEXT GIG",
      venues.length > 0 ? `${venues.length} VENUES` : null,
      gigs.length > 0 ? `${gigs.length} GIGS LISTED` : null,
    ].filter(Boolean);
    return parts.join(" ★ ") + " ★ ";
  }, [gigs, venues]);

  const row = text.repeat(4);
  return (
    <div className="bndy-ticker" aria-hidden="true">
      <div className="bndy-ticker-in">
        <span>{row}</span><span>{row}</span>
      </div>
    </div>
  );
}
