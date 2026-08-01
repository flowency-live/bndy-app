"use client";

import { Ticket } from "lucide-react";
import type { Venue } from "@/domain/types";

/**
 * VenueTicketingBanner - Shows venue-level ticket link when available.
 *
 * Behavior:
 * - Only renders when venue.standardTicketed === true AND standardTicketUrl exists
 * - Links to venue's standard ticket page, opens in new tab
 * - Shows destination domain (e.g., "Tickets at thehairydogderby.co.uk")
 * - NEVER says "Buy tickets" (bndy does not sell tickets)
 */
export function VenueTicketingBanner({ venue }: { venue: Venue | null }) {
  // Suppress banner if no venue, not ticketed, or no URL
  if (!venue?.standardTicketed || !venue.standardTicketUrl) {
    return null;
  }

  // Extract domain for display (e.g., "thehairydogderby.co.uk")
  let domain: string;
  try {
    const url = new URL(venue.standardTicketUrl);
    domain = url.hostname.replace(/^www\./, "");
  } catch {
    // Invalid URL - suppress banner
    return null;
  }

  return (
    <div className="mt-4 rounded-xl border border-cyan/30 bg-cyan/10">
      <a
        href={venue.standardTicketUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2.5 px-4 py-3 transition-colors hover:bg-cyan/5"
      >
        <Ticket size={18} className="shrink-0 text-cyan" />
        <span className="min-w-0 text-[13.5px] font-semibold">
          Tickets at{" "}
          <span className="font-bold text-cyan">{domain}</span>
        </span>
      </a>
      {venue.standardTicketInformation && (
        <div className="border-t border-cyan/20 px-4 py-2.5 text-[12.5px] text-dim">
          {venue.standardTicketInformation}
        </div>
      )}
    </div>
  );
}
