"use client";

// Cancel / un-cancel a gig (backlog feature 7). Cancel is public information:
// the gig stays visible as a ghosted row with a CANCELLED stamp.

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { curatorApi, useCuratorInvalidate } from "@/lib/curator";
import type { Gig } from "@/domain/types";

const field =
  "w-full rounded-xl border border-line bg-white/5 px-3.5 py-2.5 text-[14px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]";

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
          <h2 className="text-lg font-black tracking-tight text-txt">Un-cancel this gig?</h2>
          <p className="mt-1 text-[13px] font-semibold text-dim">
            The CANCELLED stamp comes off and the gig returns to the map.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => curatorApi.uncancelEvent(gig.id))}
            className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 text-[14px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Un-cancel gig"}
          </button>
        </>
      ) : (
        <>
          <h2 className="text-lg font-black tracking-tight text-txt">Cancel this gig?</h2>
          <p className="mt-1 text-[13px] font-semibold text-dim">
            The gig stays visible as a ghosted row with a CANCELLED stamp on the
            artist and venue pages. It leaves the map.
          </p>
          <label className="mb-1 mt-4 block text-[11px] font-extrabold uppercase tracking-wide text-dim">Reason</label>
          <input
            className={field}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Venue closed that night, band pulled out…"
          />
          {error && (
            <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
              {error}
            </p>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => run(() => curatorApi.cancelEvent(gig.id, reason.trim() || undefined))}
            className="mt-5 w-full rounded-xl bg-amber-600 px-4 py-3 text-[14px] font-extrabold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Cancel gig"}
          </button>
        </>
      )}
      {error && gig.cancelled && (
        <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
          {error}
        </p>
      )}
    </Sheet>
  );
}
