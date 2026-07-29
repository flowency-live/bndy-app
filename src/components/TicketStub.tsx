"use client";

import { cn } from "@/lib/cn";

/**
 * Perforated ticket stub — shown ONLY on ticketed gigs. Free is the unmarked
 * default (most bndy gigs are free; we never claim "free", we only mark tickets).
 * Colours come from --stub-bg/--stub-fg (per-skin, AA-verified in skins.css).
 *
 * `url`: renders as a direct tap-through link. Only pass it where the stub is
 * NOT nested inside another interactive element (rows/cards are <button>s —
 * nested <a> is invalid HTML, so rows show a plain stub and the GigSheet
 * carries the link).
 * `onCard`: matches the perforation notches to card backgrounds.
 * `price`: optional "£12" segment after the perforation divider (needs the
 * backend ticketPrice field once that lands).
 */
export function TicketStub({ url, price, onCard, className }: { url?: string; price?: string; onCard?: boolean; className?: string }) {
  const cls = cn("bndy-stub", onCard && "bndy-stub-oncard", className);
  const inner = (
    <>
      Tickets
      {price && <span className="bndy-stub-px">{price}</span>}
    </>
  );
  if (url) {
    return (
      <a href={url} target="_blank" rel="noopener" className={cls} onClick={(e) => e.stopPropagation()} aria-label={price ? `Tickets, ${price}` : "Tickets"}>
        {inner}
      </a>
    );
  }
  return <span className={cls}>{inner}</span>;
}
