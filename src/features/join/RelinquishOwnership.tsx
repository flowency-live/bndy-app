"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Unlink } from "lucide-react";
import { relinquishOwnership } from "./manageApi";
import { trackJoin } from "./joinAnalytics";

export function RelinquishOwnership({
  entityType,
  entityId,
  entityName,
  onRelinquished,
}: {
  entityType: "artist" | "venue";
  entityId: string;
  entityName: string;
  onRelinquished?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [confirmName, setConfirmName] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const confirmed = confirmName.trim().toLocaleLowerCase() === entityName.trim().toLocaleLowerCase();

  const relinquish = async () => {
    if (!confirmed) return;
    setLoading(true);
    setError(null);
    try {
      await relinquishOwnership(entityType, entityId);
      trackJoin("ownership_relinquished" as never, { entityType, step: "manage" });
      setDone(true);
      onRelinquished?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not relinquish ownership.");
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="mt-4 flex items-start gap-2 rounded-xl border border-[var(--acc)] px-3 py-3 text-[11px] font-bold text-[var(--acc-text)]">
        <CheckCircle2 size={15} className="mt-0.5 shrink-0" />
        You no longer own this {entityType}. Its public page is still on bndy and can be claimed again.
      </div>
    );
  }

  return (
    <div className="mt-4 border-t border-line pt-4">
      <button type="button" onClick={() => setOpen((value) => !value)} className="flex items-center gap-2 text-[11px] font-black text-dim hover:text-red-500">
        <Unlink size={14} /> Relinquish ownership
      </button>
      {open && (
        <div className="mt-3 rounded-xl border border-red-500/30 p-3">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-red-500" />
            <div>
              <div className="text-[11.5px] font-black">This does not delete {entityName}.</div>
              <p className="mt-1 text-[10.5px] font-semibold leading-relaxed text-dim">
                Your owner relationship will be removed and the {entityType} becomes unclaimed. If another owner/admin currently manages it, bndy will block this and ask you to transfer ownership or remove that access first.
              </p>
            </div>
          </div>
          <label className="mt-3 block text-[9.5px] font-black uppercase tracking-wide text-dim">Type “{entityName}” to confirm</label>
          <input value={confirmName} onChange={(event) => setConfirmName(event.target.value)} className="mt-1.5 w-full rounded-xl border border-line bg-transparent px-3 py-2 text-[12px] font-semibold outline-none focus:border-red-500" />
          <button type="button" disabled={!confirmed || loading} onClick={relinquish} className="mt-3 flex min-h-9 w-full items-center justify-center gap-2 rounded-xl border border-red-500/40 px-3 text-[10.5px] font-black text-red-500 transition hover:bg-red-500/10 disabled:opacity-35">
            {loading ? <Loader2 size={13} className="animate-spin" /> : <Unlink size={13} />} Relinquish ownership
          </button>
          {error && <p className="mt-2 text-[10.5px] font-bold text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
