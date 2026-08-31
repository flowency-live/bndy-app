"use client";

import { useCallback, useEffect, useState } from "react";

type InstallChoice = { outcome: "accepted" | "dismissed"; platform: string };
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<InstallChoice>;
}

const DISMISSED_KEY = "bndy.install.dismissedAt";
const DISMISS_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function isStandalone() {
  if (typeof window === "undefined") return true;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function isiOS() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

// Global state to share across components
let globalPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    globalPrompt = e as BeforeInstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    globalPrompt = null;
    notify();
  });
}

export function useInstallPrompt() {
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    const update = () => forceUpdate((n) => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const canInstall = globalPrompt !== null || (isiOS() && !isStandalone());
  const isIOS = isiOS();

  const install = useCallback(async () => {
    if (!globalPrompt) return false;
    await globalPrompt.prompt();
    const choice = await globalPrompt.userChoice;
    if (choice.outcome === "accepted") {
      globalPrompt = null;
      notify();
      return true;
    }
    return false;
  }, []);

  const dismiss = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch { /* ignore */ }
  }, []);

  const wasDismissed = useCallback(() => {
    try {
      const dismissedAt = Number(localStorage.getItem(DISMISSED_KEY) || 0);
      return dismissedAt > 0 && Date.now() - dismissedAt < DISMISS_FOR_MS;
    } catch {
      return false;
    }
  }, []);

  return { canInstall, isIOS, install, dismiss, wasDismissed, isStandalone: isStandalone() };
}
