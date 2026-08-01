"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";

const KEY = "bndy.disclaimer.dismissed";

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
  };

  if (!mounted || !open) return null;

  return (
    <div className="fixed inset-x-0 bottom-16 z-40 px-3 pb-2 lg:bottom-0 lg:left-60 lg:px-4 lg:pb-3">
      <div className="mx-auto flex max-w-content items-center gap-3 rounded-2xl border border-[#e0a72e]/35 bg-[#1a1207]/95 px-4 py-3 shadow-[0_10px_40px_rgba(0,0,0,.5)] backdrop-blur supports-[backdrop-filter]:bg-[#1a1207]/85">
        <AlertTriangle size={17} className="shrink-0 text-[#f0b232]" />
        <p className="min-w-0 flex-1 text-[12.5px] font-semibold leading-snug text-[#f3e6cf]">
          Listings can change. Always check with the venue or their socials before you travel.
        </p>
        <button onClick={dismiss} className="shrink-0 rounded-lg px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-[#f0b232] transition-colors hover:bg-white/10">
          OK
        </button>
      </div>
    </div>
  );
}
