"use client";

import { useEffect, useState } from "react";
import { BrandWordmark } from "@/components/BrandWordmark";

const KEY = "bndy-splashed";

export function Splash() {
  const [show, setShow] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
      sessionStorage.setItem(KEY, "1");
    } catch { /* ignore */ }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setShow(true);
    const t1 = window.setTimeout(() => setLeaving(true), 2300);
    const t2 = window.setTimeout(() => setShow(false), 2850);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
  }, []);

  if (!show) return null;
  return (
    <div
      className={`bndy-splash ${leaving ? "gone" : ""}`}
      onClick={() => { setLeaving(true); window.setTimeout(() => setShow(false), 500); }}
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
