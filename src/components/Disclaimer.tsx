"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const KEY = "bndy.disclaimer.dismissed";
export const DISCLAIMER_DISMISSED_EVENT = "bndy:disclaimer-dismissed";

/** Global "check before you travel" notice. Shows once per session on first load. */
export function Disclaimer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (sessionStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    window.dispatchEvent(new Event(DISCLAIMER_DISMISSED_EVENT));
  };

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-2 lg:bottom-0 lg:left-60 lg:px-4 lg:pb-3">
      <div className="mx-auto flex max-w-content items-center gap-3 rounded-2xl border border-[#f0b232]/65 bg-[#130d05]/95 px-3.5 py-3 shadow-[0_14px_50px_rgba(0,0,0,.62),0_0_30px_rgba(240,178,50,.10)] backdrop-blur-xl">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#f0b232]/45 bg-[#f0b232]/12 shadow-[inset_0_0_18px_rgba(240,178,50,.08)]">
          <AlertTriangle size={19} strokeWidth={2.35} className="text-[#ffc34d]" />
        </div>

        <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-[1.42] text-[#f7ead5] sm:text-[13px]">
          <span className="font-black text-white">Gig listings can change.</span>{" "}
          Always check with venues, artists or on social media before you travel.
        </p>

        <button
          onClick={dismiss}
          className="group relative shrink-0 rounded-xl bg-[#f0b232] px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.08em] text-[#1a1207] shadow-[0_0_18px_rgba(240,178,50,.26)] transition-transform active:scale-95"
        >
          <span className="pointer-events-none absolute inset-0 rounded-xl border border-[#f0b232] opacity-45 motion-safe:animate-ping" aria-hidden />
          <span className="relative">OK</span>
        </button>
      </div>
    </div>
  );
}
