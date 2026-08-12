"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Responsive overlay: bottom sheet on mobile, centered modal on desktop.
 *  Portals to <body>: an ancestor with backdrop-filter/transform otherwise becomes
 *  the containing block for position:fixed and traps the sheet inside it.
 *  R4 fix: focus trap, focus restoration, close button. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  // Track the element that triggered the open (for focus restoration)
  useEffect(() => {
    if (open) {
      triggerRef.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Escape key handler + focus trap + focus restoration
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      // Focus trap: Tab and Shift+Tab cycle within the dialog
      if (e.key === "Tab") {
        const dialog = dialogRef.current;
        if (!dialog) return;
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", onKey);

    // Move focus into the dialog on open
    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (dialog) {
        const first = dialog.querySelector<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (first) first.focus();
        else dialog.focus();
      }
    }, 50); // Small delay to allow animation to start

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
      // Restore focus to the trigger element
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!mounted) return null;

  // Don't render content when closed (removes from tab sequence entirely)
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50" aria-hidden={false}>
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/55 transition-opacity duration-300 opacity-100"
        aria-label="Close dialog"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "glass-hi absolute border-line-hi shadow-2xl transition-transform duration-[420ms] ease-pop",
          // mobile: bottom sheet
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-[24px] border-t",
          // desktop: centered modal
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border",
          "translate-y-0 lg:opacity-100",
        )}
      >
        {/* Close button - accessibility requirement */}
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-8 w-8 items-center justify-center rounded-lg text-dim hover:bg-white/10 hover:text-txt transition-colors"
        >
          <X size={18} />
        </button>
        <div className="mx-auto mt-2 h-1 w-9 rounded-full bg-white/25 lg:hidden" />
        <div className="max-h-[82dvh] overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-3 lg:max-h-[80vh] lg:pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
