"use client";

// "Flag a problem" (backlog feature 6). Works signed out — no account needed.

import { useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { submitFlag, type FlagEntityType } from "@/lib/flags";
import { cn } from "@/lib/cn";

export function FlagButton({
  type,
  id,
  name,
  className,
}: {
  type: FlagEntityType;
  id: string;
  name: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      await submitFlag(type, id, name, reason.trim());
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Send failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const close = () => {
    setOpen(false);
    setDone(false);
    setReason("");
    setError(null);
  };

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        className={cn(
          "flex items-center gap-1.5 rounded-xl border border-line glass px-3 py-2 text-[12px] font-extrabold text-dim transition-colors hover:text-txt",
          className,
        )}
      >
        <Flag size={13} className="text-[var(--acc2)]" /> Flag a problem
      </button>

      <Sheet open={open} onClose={close}>
        {done ? (
          <div className="py-4 text-center">
            <h2 className="text-lg font-black tracking-tight text-txt">Thanks — got it.</h2>
            <p className="mt-1 text-[13px] font-semibold text-dim">
              bndy staff review every flag.
            </p>
            <button
              type="button"
              onClick={close}
              className="mt-5 w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[14px] font-extrabold text-black"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <h2 className="text-lg font-black tracking-tight text-txt">Flag a problem</h2>
            <p className="mt-1 text-[13px] font-semibold text-dim">
              Something wrong with {name}? Tell us what. No account needed —
              sign in and we can come back to you about it.
            </p>
            <textarea
              rows={4}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Wrong date, closed down, duplicate, not a real gig…"
              className="mt-4 w-full rounded-xl border border-line bg-white/5 px-3.5 py-2.5 text-[14px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-[var(--acc)]"
            />
            {error && (
              <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
                {error}
              </p>
            )}
            <button
              type="button"
              disabled={busy || reason.trim().length < 3}
              onClick={send}
              className="mt-4 w-full rounded-xl bg-[var(--acc)] px-4 py-3 text-[14px] font-extrabold text-black transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {busy ? <Loader2 size={18} className="mx-auto animate-spin" /> : "Send flag"}
            </button>
          </>
        )}
      </Sheet>
    </>
  );
}
