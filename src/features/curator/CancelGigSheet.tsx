"use client";

// Cancel / un-cancel a gig (backlog feature 7). Cancel is public information:
// the gig stays visible as a ghosted row with a CANCELLED stamp.

import { useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { curatorApi, useCuratorInvalidate } from "@/lib/curator";
import { SheetFooter, SheetHeader } from "./CuratorSheets";
import type { Gig } from "@/domain/types";

const field =
  "w-full rounded-2xl border border-line glass px-4 py-3 text-[14.5px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55";

export function CancelGigSheet({ gig, open, onClose }: { gig: Gig; open: boolean; onClose: () => void }) {
  const invalidate = useCuratorInvalidate();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await invalidate("event", gig.id);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} onClose={onClose}>
      {gig.cancelled ? (
        <>
          <SheetHeader
            title="Un-cancel this gig?"
            sub="The CANCELLED stamp comes off and the gig returns to the map."
            onClose={onClose}
          />
          <SheetFooter busy={busy} saveLabel="Un-cancel gig" tone="green" onCancel={onClose} onSave={() => run(() => curatorApi.uncancelEvent(gig.id))} />
        </>
      ) : (
        <>
          <SheetHeader
            title="Cancel this gig?"
            sub="The gig stays visible with a CANCELLED stamp on the artist and venue pages. It leaves the map."
            onClose={onClose}
          />
          <label className="mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Reason</label>
          <input
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Venue closed that night, band pulled out…"
          />
          <SheetFooter busy={busy} saveLabel="Cancel gig" tone="amber" onCancel={onClose} onSave={() => run(() => curatorApi.cancelEvent(gig.id, reason.trim() || undefined))} />
        </>
      )}
      {error && (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
          {error}
        </p>
      )}
    </Sheet>
  );
}
