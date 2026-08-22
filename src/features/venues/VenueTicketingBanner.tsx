"use client";

import { ExternalLink, Ticket } from "lucide-react";
import { safeHref } from "@/lib/safeHref";
import { cn } from "@/lib/cn";
import type { Venue } from "@/domain/types";

/**
 * Venue-level ticketing notice.
 *
 * `standardTicketed` is the status flag and therefore controls visibility.
 * `standardTicketUrl` only controls whether we can offer a safe outbound link.
 * A ticketed venue should never silently lose its status just because the URL is
 * missing or temporarily invalid.
 */
export function VenueTicketingBanner({ venue, className }: { venue: Venue | null; className?: string }) {
  if (!venue?.standardTicketed) return null;

  const ticketUrl = safeHref(venue.standardTicketUrl);
  let domain: string | null = null;
  if (ticketUrl) {
    try {
      domain = new URL(ticketUrl).hostname.replace(/^www\./, "");
    } catch {
      domain = null;
    }
  }

  return (
    <aside
      aria-label="Ticketed venue"
      className={cn(
        "mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--acc)_42%,var(--line))] bg-[color-mix(in_srgb,var(--acc)_11%,var(--card))] p-3.5",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--acc)_18%,var(--card2))] text-[var(--acc-text)]">
          <Ticket size={19} strokeWidth={2.4} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="text-[10.5px] font-black uppercase tracking-[1px] text-[var(--acc-text)]">Ticketed venue</div>
          <div className="mt-0.5 text-[12.5px] font-semibold leading-snug text-txt">
            {venue.standardTicketInformation || "Gigs here normally need a ticket."}
          </div>
          {domain && <div className="mt-0.5 truncate text-[10.5px] font-bold text-dim">Tickets via {domain}</div>}
        </div>

        {ticketUrl && (
          <a
            href={ticketUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bndy-btn flex min-h-11 shrink-0 items-center justify-center gap-1.5 px-3 text-[11.5px]"
            aria-label={domain ? `Open ticket page at ${domain}` : "Open venue ticket page"}
          >
            Tickets <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </aside>
  );
}
