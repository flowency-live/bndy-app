"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "bndy-onboarding-seen";
const SHOW_DELAY = 1800;

type Variant = "bubble" | "tether";

/** Returns true if user should see the onboarding nudge (mobile, not authenticated, not dismissed) */
function shouldShow(): boolean {
  if (typeof window === "undefined") return false;
  if (window.innerWidth >= 1024) return false; // lg breakpoint
  return !localStorage.getItem(STORAGE_KEY);
}

/** Pick a random variant for natural A/B testing */
function pickVariant(): Variant {
  return Math.random() > 0.5 ? "bubble" : "tether";
}

export function OnboardingNudge() {
  const { isAuthenticated, isLoading } = useAuth();
  const [visible, setVisible] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [variant] = useState<Variant>(() => pickVariant());
  const [mounted, setMounted] = useState(false);
  const dismissTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    setMounted(true);
    return () => {
      if (dismissTimeoutRef.current) window.clearTimeout(dismissTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isLoading || isAuthenticated) return;
    if (!shouldShow()) return;

    const timer = window.setTimeout(() => setVisible(true), SHOW_DELAY);
    return () => window.clearTimeout(timer);
  }, [isLoading, isAuthenticated]);

  const dismiss = useCallback(() => {
    setDismissing(true);
    localStorage.setItem(STORAGE_KEY, "1");
    dismissTimeoutRef.current = window.setTimeout(() => {
      setVisible(false);
      setDismissing(false);
      // Dispatch event so profile icon knows to start pulsing
      window.dispatchEvent(new CustomEvent("bndy-onboarding-dismissed"));
    }, variant === "bubble" ? 800 : 600);
  }, [variant]);

  const goToLogin = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "1");
    // Let the link navigate naturally
  }, []);

  if (!mounted || !visible || isAuthenticated) return null;

  const content = (
    <div
      className={cn(
        "fixed inset-0 z-[90] lg:hidden",
        dismissing && "pointer-events-none",
      )}
    >
      {/* Backdrop */}
      <div
        className={cn(
          "absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300",
          dismissing && "opacity-0",
        )}
        onClick={dismiss}
      />

      {variant === "bubble" ? (
        <BubbleVariant dismissing={dismissing} onDismiss={dismiss} onLogin={goToLogin} />
      ) : (
        <TetherVariant dismissing={dismissing} onDismiss={dismiss} onLogin={goToLogin} />
      )}
    </div>
  );

  return createPortal(content, document.body);
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Variant A: Speech Bubble that collapses into a glowing orb and flies to icon
 * ───────────────────────────────────────────────────────────────────────────── */

function BubbleVariant({ dismissing, onDismiss, onLogin }: { dismissing: boolean; onDismiss: () => void; onLogin: () => void }) {
  return (
    <>
      {/* Particles that appear during dismiss */}
      {dismissing && (
        <div className="onboarding-particles">
          {Array.from({ length: 8 }).map((_, i) => (
            <span
              key={i}
              className="onboarding-particle"
              style={{ "--i": i, "--delay": `${i * 40}ms` } as React.CSSProperties}
            />
          ))}
        </div>
      )}

      {/* Speech bubble card */}
      <div
        className={cn(
          "absolute left-4 right-4 mx-auto max-w-sm",
          "bottom-[calc(8rem+env(safe-area-inset-bottom,0px))]",
          dismissing ? "onboarding-bubble-collapse" : "onboarding-bubble-enter",
        )}
      >
        {/* Tail pointing to profile icon */}
        <div className="absolute -bottom-3 left-[4.5rem] h-4 w-4 rotate-45 rounded-sm border-b border-r border-[var(--acc)]/40 bg-card" />

        <div className="relative overflow-hidden rounded-2xl border border-[var(--acc)]/40 bg-card shadow-[0_0_40px_color-mix(in_srgb,var(--acc)_25%,transparent)]">
          {/* Gradient accent bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--acc)] via-[var(--acc2)] to-[var(--acc)]" />

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-white/10 hover:text-txt"
          >
            <X size={18} />
          </button>

          <div className="px-5 pb-5 pt-6">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--acc)]" />
              <span className="text-[10px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">Make bndy yours</span>
            </div>

            <h2 className="text-[18px] font-black leading-tight text-txt">Join or sign in</h2>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-dim">
              Follow favourite artists and venues, save your filters and shape discovery around you.
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href="/login"
                onClick={onLogin}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-acc py-3 text-[13px] font-black text-on-acc transition-transform active:scale-[.97]"
              >
                Get started
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl border border-line px-4 py-3 text-[13px] font-bold text-dim transition-colors hover:text-txt"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Variant C: Bottom Sheet with visual tether to profile icon
 * ───────────────────────────────────────────────────────────────────────────── */

function TetherVariant({ dismissing, onDismiss, onLogin }: { dismissing: boolean; onDismiss: () => void; onLogin: () => void }) {
  return (
    <>
      {/* Tether line from profile icon to sheet */}
      <svg
        className={cn(
          "pointer-events-none absolute inset-0 h-full w-full",
          dismissing && "onboarding-tether-retract",
        )}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="tether-gradient" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="var(--acc)" stopOpacity="0.8" />
            <stop offset="100%" stopColor="var(--acc)" stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {/* Line from icon position to bottom of sheet */}
        <line
          x1="calc(4.75rem + 1.5rem)"
          y1="calc(100% - 4.75rem - env(safe-area-inset-bottom, 0px) - 1.5rem)"
          x2="50%"
          y2="calc(100% - 10rem - env(safe-area-inset-bottom, 0px))"
          stroke="url(#tether-gradient)"
          strokeWidth="2"
          strokeDasharray="6 4"
          className={cn(
            "origin-bottom transition-all duration-500",
            dismissing && "opacity-0",
          )}
        />
        {/* Glow dot at icon end */}
        <circle
          cx="calc(4.75rem + 1.5rem)"
          cy="calc(100% - 4.75rem - env(safe-area-inset-bottom, 0px) - 1.5rem)"
          r="4"
          fill="var(--acc)"
          className={cn(
            "transition-all duration-300",
            dismissing ? "r-8 opacity-0" : "animate-pulse",
          )}
        />
      </svg>

      {/* Bottom sheet */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 pb-safe",
          dismissing ? "onboarding-sheet-retract" : "onboarding-sheet-enter",
        )}
      >
        <div className="mx-3 mb-[calc(5.5rem+env(safe-area-inset-bottom,0px))] overflow-hidden rounded-2xl border border-[var(--acc)]/40 bg-card shadow-[0_-8px_40px_color-mix(in_srgb,var(--acc)_25%,transparent)]">
          {/* Gradient accent bar */}
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[var(--acc)] via-[var(--acc2)] to-[var(--acc)]" />

          {/* Handle bar */}
          <div className="flex justify-center py-2">
            <div className="h-1 w-10 rounded-full bg-line" />
          </div>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss"
            className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full text-dim transition-colors hover:bg-white/10 hover:text-txt"
          >
            <X size={18} />
          </button>

          <div className="px-5 pb-5 pt-1">
            <div className="mb-2 flex items-center gap-2">
              <Sparkles size={16} className="text-[var(--acc)]" />
              <span className="text-[10px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">Make bndy yours</span>
            </div>

            <h2 className="text-[18px] font-black leading-tight text-txt">Join or sign in</h2>
            <p className="mt-2 text-[13px] font-semibold leading-relaxed text-dim">
              Follow favourite artists and venues, save your filters and shape discovery around you.
            </p>

            <div className="mt-4 flex gap-2">
              <Link
                href="/login"
                onClick={onLogin}
                className="group flex flex-1 items-center justify-center gap-2 rounded-xl bg-acc py-3 text-[13px] font-black text-on-acc transition-transform active:scale-[.97]"
              >
                Get started
                <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
              </Link>
              <button
                type="button"
                onClick={onDismiss}
                className="rounded-xl border border-line px-4 py-3 text-[13px] font-bold text-dim transition-colors hover:text-txt"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * Hook for profile icon to know when to pulse
 * ───────────────────────────────────────────────────────────────────────────── */

export function useProfilePulse() {
  const { isAuthenticated } = useAuth();
  const [shouldPulse, setShouldPulse] = useState(false);

  useEffect(() => {
    // Pulse if not authenticated and onboarding was dismissed (or already seen)
    if (!isAuthenticated && typeof window !== "undefined") {
      const seen = localStorage.getItem(STORAGE_KEY);
      setShouldPulse(!!seen);

      const handleDismiss = () => setShouldPulse(true);
      window.addEventListener("bndy-onboarding-dismissed", handleDismiss);
      return () => window.removeEventListener("bndy-onboarding-dismissed", handleDismiss);
    }
    setShouldPulse(false);
  }, [isAuthenticated]);

  return shouldPulse;
}
