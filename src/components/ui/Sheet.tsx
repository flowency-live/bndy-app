"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/** Responsive overlay: bottom sheet on mobile, centered modal on desktop.
 *  Portals to <body>: an ancestor with backdrop-filter/transform otherwise becomes
 *  the containing block for position:fixed and traps the sheet inside it. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!mounted) return null;
  return createPortal(
    <div className={cn("fixed inset-0 z-50", open ? "" : "pointer-events-none")} aria-hidden={!open}>
      <div
        onClick={onClose}
        className={cn("absolute inset-0 bg-black/55 transition-opacity duration-300", open ? "opacity-100" : "opacity-0")}
      />
      <div
        role="dialog"
        aria-modal="true"
        className={cn(
          "glass-hi absolute border-line-hi shadow-2xl transition-transform duration-[420ms] ease-pop",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[24px] border-t",
          // desktop: centered modal
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border",
          open ? "translate-y-0 lg:opacity-100" : "translate-y-full lg:translate-y-[-46%] lg:opacity-0",
        )}
      >
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/25 lg:hidden" />
        <div className="max-h-[82dvh] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-3 lg:max-h-[80vh] lg:pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
