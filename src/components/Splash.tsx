"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";

const KEY = "bndy-splashed";

export function Splash() {
  const path = usePathname();
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const dismissRef = useRef<number | null>(null);

  useEffect(() => {
    // Never block a shared/deep-linked gig, festival, venue, login, etc.
    // The brand moment belongs to the main map entry only.
    if (!path.startsWith("/map")) return;
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch { /* ignore */ }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t1 = window.setTimeout(() => setLeaving(true), 950);
    const t2 = window.setTimeout(() => setShow(false), 1350);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (dismissRef.current !== null) window.clearTimeout(dismissRef.current);
    };
  }, [path]);

  if (!show) return null;
  return (
    <div
      className={`bndy-splash ${leaving ? "gone" : ""}`}
      onClick={() => {
        setLeaving(true);
        if (dismissRef.current !== null) window.clearTimeout(dismissRef.current);
        dismissRef.current = window.setTimeout(() => setShow(false), 320);
      }}
      role="presentation"
    >
      <div className="bndy-splash-logo">
        <BrandWordmark
          className="h-16 w-auto text-[var(--txt)]"
          title="bndy"
        />
      </div>
      <div className="bndy-splash-stamp">
        Keeping <b>LIVE</b> music <b>ALIVE</b>!
      </div>
    </div>
  );
}
