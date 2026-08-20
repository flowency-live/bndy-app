"use client";

// The COLLAPSED festival block: one row standing in for a venue's whole
// festival bill (Tigerfest at The Rigger = five acts, one row). Used by the
// venue page gig list and the gigs feed; the festival schedule renders the
// expanded panel instead. Tap-through goes to the festival page, which owns
// the full bill - the row is a signpost, not a summary to squint at.

import Link from "next/link";
import { ArrowRight, CalendarRange } from "lucide-react";
import type { FestivalBlock } from "@/domain/festivalBlocks";
import { blockSummary } from "@/domain/festivalBlocks";
import { cn } from "@/lib/cn";

export function FestivalBlockRow({
  block,
  showVenue = false,
  leading,
  className,
}: {
  block: FestivalBlock;
  showVenue?: boolean;
  leading?: React.ReactNode;
  className?: string;
}) {
  const inner = (
    <>
      {leading}
      <span
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-xl border px-3 py-2.5"
        style={{
          color: "var(--txt)",
          borderColor: "color-mix(in srgb, var(--acc) 58%, var(--line))",
          background: "linear-gradient(105deg, color-mix(in srgb, var(--acc) 24%, var(--card)) 0%, color-mix(in srgb, var(--acc2) 11%, var(--card)) 72%, var(--card) 100%)",
          boxShadow: "inset 3px 0 0 var(--acc)",
        }}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-line-hi bg-black/15">
          <CalendarRange size={14} strokeWidth={2.6} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[8px] font-black uppercase tracking-[1.5px] text-dim">Festival</span>
          <span className="block truncate text-[13.5px] font-black leading-tight">
            {block.festivalName || "Festival"}
            {showVenue && block.venueName ? <span className="font-extrabold text-dim"> at {block.venueName}</span> : null}
          </span>
        </span>
        <span className="shrink-0 text-right">
          <span className="block text-[10.5px] font-black">{blockSummary(block)}</span>
          <span className="mt-0.5 flex items-center justify-end gap-1 text-[9px] font-extrabold uppercase tracking-[1px] text-dim">
            Full line up <ArrowRight size={10} />
          </span>
        </span>
      </span>
    </>
  );

  const classes = cn("flex w-full items-center gap-4 py-2 text-left", className);
  if (!block.festivalSlug) return <div className={classes}>{inner}</div>;
  return (
    <Link href={`/festivals/${block.festivalSlug}`} className={cn(classes, "transition-transform hover:-translate-y-px active:translate-y-0")}>
      {inner}
    </Link>
  );
}
