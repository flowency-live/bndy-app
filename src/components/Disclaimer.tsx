"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";

const KEY = "bndy.disclaimer.dismissed";

/** Global "check before you travel" notice. Shows once across the bottom on every
 *  screen; dismissible, with a persistent (!) button to bring it back. */
export function Disclaimer() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      if (localStorage.getItem(KEY) !== "1") setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  const dismiss = () => {
    setOpen(false);
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
  };
  const reopen = () => setOpen(true);

  if (!mounted) return null;

  return open ? (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-2 lg:bottom-0 lg:left-60 lg:px-4 lg:pb-3">
      <div className="mx-auto flex max-w-content items-center gap-3 rounded-2xl border border-[#e0a72e]/35 bg-[#1a1207]/95 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,.5)] backdrop-blur supports-[backdrop-filter]:bg-[#1a1207]/85">
        <AlertTriangle size={17} className="shrink-0 text-[#f0b232]" />
        <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-[#f3e6cf]">
          Listings can change. Always check with the venue or their socials before you travel.
        </p>
        <button onClick={dismiss} aria-label="Dismiss notice" className="shrink-0 rounded-lg p-1 text-[#f3e6cf]/70 transition-colors hover:bg-white/10 hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  ) : (
    <button
      onClick={reopen}
      aria-label="Show travel notice"
      className="fixed bottom-20 right-4 z-40 flex h-9 w-9 items-center justify-center rounded-full border border-[#e0a72e]/40 bg-[#1a1207]/90 text-[#f0b232] shadow-[0_6px_20px_rgba(0,0,0,.45)] backdrop-blur transition-transform active:scale-95 lg:bottom-4"
    >
      <AlertTriangle size={16} />
    </button>
  );
}
