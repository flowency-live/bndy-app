"use client";

// Curator-only entry points into the festival builder. Each renders nothing
// for everyone else, so server components can place them freely.

import Link from "next/link";
import { CalendarRange, Pencil } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";

/** "Create a festival" button - festivals index header. */
export function CreateFestivalButton() {
  const { isCurator } = useAuth();
  if (!isCurator) return null;
  return (
    <Link href="/festivals/new" className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-line bg-card2 px-3 py-2 text-[11px] font-black text-dim transition-colors hover:text-txt">
      <CalendarRange size={13} className="text-[var(--acc)]" /> Create a festival
    </Link>
  );
}

/** "Manage" chip - public festival page, links to the workbench. */
export function ManageFestivalChip({ slug }: { slug: string }) {
  const { isCurator } = useAuth();
  if (!isCurator) return null;
  return (
    <Link href={`/festivals/${slug}/manage`} className="inline-flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt">
      <Pencil size={13} className="text-[var(--acc)]" /> Manage
    </Link>
  );
}

/** "Start a festival" - venue page, prefills this venue as the first venue. */
export function StartFestivalLink({ venueId, venueName }: { venueId: string; venueName: string }) {
  const { isCurator } = useAuth();
  if (!isCurator) return null;
  return (
    <Link
      href={`/festivals/new?venueId=${venueId}&venueName=${encodeURIComponent(venueName)}`}
      className="flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt"
    >
      <CalendarRange size={13} className="text-[var(--acc)]" /> Start a festival
    </Link>
  );
}
