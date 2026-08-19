"use client";

// Global decorative chrome. Keep this deliberately data-free: AppShell mounts
// it on every route, so fetching gigs/venues here made unrelated pages pay the
// full discovery payload just to render a marquee count.

const ROW = "KEEPING LIVE MUSIC ALIVE ★ DISCOVER GRASSROOTS GIGS ★ SUPPORT LOCAL VENUES ★ FIND YOUR NEXT GIG ★ ";

export function LiveTicker() {
  return (
    <div className="bndy-ticker" aria-hidden="true">
      <div className="bndy-ticker-in">
        <span>{ROW}</span><span>{ROW}</span>
      </div>
    </div>
  );
}
