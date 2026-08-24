"use client";

import { useState } from "react";
import { ArrowRightLeft, CheckCircle2, Loader2 } from "lucide-react";
import { transferVenueOwnership } from "./manageApi";
import { trackJoin } from "./joinAnalytics";

export function VenueOwnershipTransfer({ venueId, venueName }: { venueId: string; venueName: string }) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const transfer = async () => {
    const target = email.trim().toLowerCase();
    if (!target) return;
    const confirmed = window.confirm(
      `Transfer ownership of ${venueName} to ${target}?\n\nYou will become an admin. The new owner will be able to manage delegates and transfer ownership again.`,
    );
    if (!confirmed) return;

    setLoading(true);
    setError(null);
    try {
      await transferVenueOwnership(venueId, target);
      trackJoin("ownership_transferred", { entityType: "venue", step: "manage" });
      setDone(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not transfer ownership.";
      setError(message.includes("already have a bndy account") ? `${message} Invite them as a delegate first, then transfer ownership after they accept.` : message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--acc)] px-3 py-3 text-[11px] font-bold text-[var(--acc-text)]">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        Ownership transferred. You remain an admin, so you can still help manage the venue.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 text-[11px] font-black text-dim hover:text-txt">
        <ArrowRightLeft size={14} /> Transfer ownership
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-line p-3">
          <p className="text-[10.5px] font-semibold leading-relaxed text-dim">The new owner must have a bndy account. Your relationship changes to admin, so the venue is never left unmanaged.</p>
          <div className="mt-3 flex gap-2">
            <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" placeholder="new-owner@email.com" className="min-w-0 flex-1 rounded-xl border border-line bg-transparent px-3 py-2 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" />
            <button type="button" disabled={loading || !email.trim()} onClick={transfer} className="bndy-btn min-h-9 shrink-0 px-3 text-[10px] disabled:opacity-50">{loading ? <Loader2 size={13} className="animate-spin" /> : "Transfer"}</button>
          </div>
          {error && <p className="mt-2 text-[10.5px] font-bold text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
