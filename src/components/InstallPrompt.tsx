"use client";

import { useEffect, useState } from "react";
import { Download, Share2, Smartphone, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandWordmark } from "@/components/BrandWordmark";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISSED_KEY = "bndy.install.dismissedAt";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;
const DISCLAIMER_KEY = "bndy.disclaimer.dismissed";

function wasRecentlyDismissed() {
  try {
    const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
    return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
  } catch {
    return false;
  }
}

function isStandalone() {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isiOS() {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function InstallPrompt() {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"native" | "ios" | null>(null);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (path.startsWith("/list-a-gig") || path.startsWith("/login")) return;
    if (!window.matchMedia("(max-width: 1023px)").matches || isStandalone() || wasRecentlyDismissed()) return;

    let iosTimer: number | undefined;

    if (isiOS()) {
      iosTimer = window.setTimeout(() => setMode("ios"), 8000);
    }

    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setMode("native");
    };

    const handleInstalled = () => {
      setOpen(false);
      setMode(null);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      if (iosTimer) window.clearTimeout(iosTimer);
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, [path]);

  useEffect(() => {
    if (!mode || wasRecentlyDismissed()) return;

    const tryShow = () => {
      if (wasRecentlyDismissed()) return;
      try {
        if (sessionStorage.getItem(DISCLAIMER_KEY) !== "1") return;
      } catch {
        // If storage is unavailable, do not block the install prompt forever.
      }
      setOpen(true);
    };

    tryShow();
    const timer = window.setInterval(tryShow, 1000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const dismiss = () => {
    setOpen(false);
    setMode(null);
    setDeferredPrompt(null);
    try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
  };

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    setOpen(false);
    setDeferredPrompt(null);
    setMode(null);
    if (choice.outcome === "dismissed") {
      try { localStorage.setItem(DISMISSED_KEY, String(Date.now())); } catch { /* ignore */ }
    }
  };

  if (!open || !mode) return null;

  const ios = mode === "ios";

  return (
    <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom,0px))] z-50 px-3 lg:hidden">
      <div
        role="dialog"
        aria-label="Install app"
        className="mx-auto max-w-md overflow-hidden rounded-[22px] border border-[color-mix(in_srgb,var(--acc)_48%,var(--line))] bg-[color-mix(in_srgb,var(--card)_94%,transparent)] shadow-[0_16px_50px_rgba(0,0,0,.48)] backdrop-blur-xl"
      >
        <div className="flex items-start gap-3 p-4 pb-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-[#0F1729] shadow-[0_0_0_1px_rgba(255,255,255,.08)]">
            <BrandWordmark className="w-9 text-[#F97316]" title="bndy" />
          </div>

          <div className="min-w-0 flex-1 pt-0.5">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-[15px] font-black leading-tight text-txt">Add to your Home Screen</p>
                <p className="mt-1 text-[11.5px] font-semibold leading-snug text-dim">
                  {ios
                    ? "Keep live music one tap away and open it like an app."
                    : "Keep live music one tap away and open it full-screen like an app."}
                </p>
              </div>
              <button onClick={dismiss} aria-label="Not now" className="-mr-1 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-dim transition-colors hover:bg-card2 hover:text-txt">
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        {ios ? (
          <div className="mx-4 mb-3 flex items-center gap-2 rounded-xl border border-line bg-card2/70 px-3 py-2.5 text-[11px] font-bold text-txt">
            <Share2 size={17} className="shrink-0 text-[var(--acc)]" />
            <span>Tap Share</span>
            <span className="text-dim2">→</span>
            <Smartphone size={16} className="shrink-0 text-[var(--acc)]" />
            <span>Add to Home Screen</span>
          </div>
        ) : null}

        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <button onClick={dismiss} className="px-2 py-2 text-[11px] font-extrabold text-dim transition-colors hover:text-txt">
            Not now
          </button>
          {ios ? (
            <button onClick={dismiss} className="ml-auto flex items-center gap-2 rounded-xl bg-[var(--acc)] px-4 py-2.5 text-[11.5px] font-black text-white shadow-[0_0_18px_color-mix(in_srgb,var(--acc)_28%,transparent)]">
              Got it
            </button>
          ) : (
            <button onClick={install} className="ml-auto flex items-center gap-2 rounded-xl bg-[var(--acc)] px-4 py-2.5 text-[11.5px] font-black text-white shadow-[0_0_18px_color-mix(in_srgb,var(--acc)_28%,transparent)] transition-transform active:scale-[.97]">
              <Download size={15} strokeWidth={2.7} />
              Install app
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
