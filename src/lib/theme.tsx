"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { APP_SKINS, DEFAULT_SKIN, isAppSkinId, type AppSkinId } from "@/lib/appSkins";

export type ThemeMode = "light" | "dark";
/** Map-marker skin (map module registry) — unchanged legacy concept. */
export type SkinId = "pulse" | "aurora" | "neon-dot";

interface ThemeCtx {
  /** Derived from the app skin ("mid" skins count as light). */
  mode: ThemeMode;
  /** Compat: jumps to the bndy classic skin of that mode. */
  setMode: (m: ThemeMode) => void;
  /** Compat: switches to the light/dark counterpart skin. */
  toggle: () => void;
  /** Map-marker skin (legacy). */
  skin: SkinId;
  setSkin: (s: SkinId) => void;
  /** The 9-skin app system — spec: SKINS-SYSTEM-SPEC.md */
  appSkin: AppSkinId;
  setAppSkin: (s: AppSkinId) => void;
}
const Ctx = createContext<ThemeCtx | null>(null);

const MAP_SKIN_KEY = "bndy-skin";
export const APP_SKIN_KEY = "bndy-app-skin";

function applySkinAttrs(s: AppSkinId) {
  const def = APP_SKINS[s];
  const el = document.documentElement;
  el.dataset.theme = s;
  el.dataset.family = def.family;
  el.classList.toggle("dark", def.mode === "dark");
  el.style.colorScheme = def.mode === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [appSkin, setAppSkinState] = useState<AppSkinId>(DEFAULT_SKIN);
  const [skin, setSkinState] = useState<SkinId>("pulse");

  // hydrate from storage (layout's no-flash script already set the attributes pre-paint)
  useEffect(() => {
    try {
      const a = localStorage.getItem(APP_SKIN_KEY);
      if (isAppSkinId(a)) setAppSkinState(a);
      const s = localStorage.getItem(MAP_SKIN_KEY) as SkinId | null;
      if (s === "pulse" || s === "aurora" || s === "neon-dot") setSkinState(s);
    } catch { /* ignore */ }
  }, []);

  // reflect app skin onto <html> + persist
  useEffect(() => {
    applySkinAttrs(appSkin);
    try { localStorage.setItem(APP_SKIN_KEY, appSkin); } catch { /* ignore */ }
  }, [appSkin]);

  const setAppSkin = useCallback((s: AppSkinId) => setAppSkinState(s), []);
  const mode: ThemeMode = APP_SKINS[appSkin].mode === "dark" ? "dark" : "light";
  const setMode = useCallback(
    (m: ThemeMode) => setAppSkinState(m === "dark" ? "bndy-dark" : "bndy-light"),
    [],
  );
  const toggle = useCallback(
    () => setAppSkinState((cur) => (APP_SKINS[cur].mode === "dark" ? "bndy-light" : "bndy-dark")),
    [],
  );
  const setSkin = useCallback((s: SkinId) => {
    setSkinState(s);
    try { localStorage.setItem(MAP_SKIN_KEY, s); } catch { /* ignore */ }
  }, []);

  const value = useMemo(
    () => ({ mode, setMode, toggle, skin, setSkin, appSkin, setAppSkin }),
    [mode, setMode, toggle, skin, setSkin, appSkin, setAppSkin],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeCtx {
  const c = useContext(Ctx);
  if (!c) throw new Error("useTheme must be used within ThemeProvider");
  return c;
}
