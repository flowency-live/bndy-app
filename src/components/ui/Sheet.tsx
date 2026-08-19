"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";

/** Responsive overlay: bottom sheet on mobile, centered modal on desktop.
 *  Portals to <body>: an ancestor with backdrop-filter/transform otherwise becomes
 *  the containing block for position:fixed and traps the sheet inside it.
 *  R4 fix: focus trap, focus restoration, close button.
 *  C2 fix: delayed unmount preserves slide animation. */
export function Sheet({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (open) {
      setVisible(true);
    } else {
      const timer = setTimeout(() => setVisible(false), 340);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // A bottom sheet should feel modal on mobile. Without this the page/map can
  // continue moving underneath the sheet, which is especially noticeable on iOS.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    const prevOverscroll = document.body.style.overscrollBehavior;
    document.body.style.overflow = "hidden";
    document.body.style.overscrollBehavior = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.overscrollBehavior = prevOverscroll;
    };
  }, [open]);

  useEffect(() => {
    if (open) triggerRef.current = document.activeElement as HTMLElement;
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }
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
    const timer = setTimeout(() => {
      const dialog = dialogRef.current;
      if (!dialog) return;
      const first = dialog.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (first) first.focus();
      else dialog.focus();
    }, 40);

    return () => {
      window.removeEventListener("keydown", onKey);
      clearTimeout(timer);
      if (triggerRef.current && typeof triggerRef.current.focus === "function") {
        triggerRef.current.focus();
      }
    };
  }, [open, onClose]);

  if (!mounted || !visible) return null;

  return createPortal(
    <div
      className={cn("fixed inset-0 z-50", open ? "" : "pointer-events-none")}
      aria-hidden={!open}
      inert={!open ? true : undefined}
    >
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-black/55 transition-opacity duration-250",
          open ? "opacity-100" : "opacity-0"
        )}
        aria-label="Close dialog"
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        tabIndex={-1}
        className={cn(
          "glass-hi absolute border-line-hi shadow-2xl transition-[transform,opacity] duration-300 ease-pop",
          "inset-x-0 bottom-0 max-h-[88dvh] rounded-t-[24px] border-t",
          "lg:inset-auto lg:left-1/2 lg:top-1/2 lg:w-[440px] lg:-translate-x-1/2 lg:-translate-y-1/2 lg:rounded-3xl lg:border",
          open ? "translate-y-0 lg:opacity-100" : "translate-y-full lg:translate-y-[-46%] lg:opacity-0",
        )}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white/90 backdrop-blur-sm transition-colors hover:bg-black/70 hover:text-white active:scale-95"
        >
          <X size={18} />
        </button>
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-white/25 lg:hidden" />
        <div className="max-h-[85dvh] overscroll-contain overflow-y-auto px-5 pb-[calc(env(safe-area-inset-bottom,0px)+18px)] pt-3 lg:max-h-[80vh] lg:pb-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
