"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "@/components/ui/Sheet";
import { useTheme } from "@/lib/theme";
import { APP_SKINS, THEMES, skinFor, type AppSkinId, type SkinMode, type SkinVariant, type ThemeId } from "@/lib/appSkins";
import { cn } from "@/lib/cn";

function Swatch({ dots, size = 18 }: { dots: [string, string, string]; size?: number }) {
  return (
    <span
      aria-hidden
      className="inline-block shrink-0 rounded-full border-2 border-line"
      style={{
        width: size,
        height: size,
        background: `conic-gradient(${dots[0]} 0 33%, ${dots[1]} 33% 66%, ${dots[2]} 66% 100%)`,
      }}
    />
  );
}

function modeLabel(mode: SkinMode) {
  return mode === "light" ? "Light" : mode === "dark" ? "Dark" : "Dusk";
}

function ModeBadge({ mode }: { mode: SkinMode }) {
  const dotStyle = mode === "light"
    ? { background: "#f8fafc", borderColor: "rgba(15,23,42,.35)" }
    : mode === "dark"
      ? { background: "#0b0d12", borderColor: "rgba(255,255,255,.45)" }
      : { background: "linear-gradient(90deg,#f8fafc 0 50%,#24202e 50% 100%)", borderColor: "rgba(127,127,127,.45)" };

  return (
    <span
      aria-label={`${modeLabel(mode)} theme`}
      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-line bg-[color-mix(in_srgb,var(--card)_82%,transparent)] px-1.5 py-0.5 font-mono text-[7.5px] font-bold uppercase tracking-[0.12em] text-dim"
    >
      <span className="h-2 w-2 rounded-full border" style={dotStyle} aria-hidden />
      {modeLabel(mode)}
    </span>
  );
}

export function SkinControl({ display, side = "right" }: { display: "sidebar" | "fab" | "map"; side?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const [mounted, setMounted] = useState(false);
  const timersRef = useRef<number[]>([]);
  useEffect(() => setMounted(true), []);
  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);
  const { appSkin, setAppSkin, theme, variant } = useTheme();
  const current = APP_SKINS[appSkin];

  const pick = useCallback(
    (s: AppSkinId) => {
      setOpen(false);
      if (s === appSkin) return;
      timersRef.current.forEach((id) => window.clearTimeout(id));
      timersRef.current = [];

      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        setWiping(false);
        setAppSkin(s);
        return;
      }

      setWiping(true);
      timersRef.current.push(window.setTimeout(() => setAppSkin(s), 220));
      timersRef.current.push(window.setTimeout(() => setWiping(false), 620));
    },
    [appSkin, setAppSkin],
  );

  return (
    <>
      {display === "sidebar" && (
        <button
          onClick={() => setOpen(true)}
          className="mt-2 flex w-full shrink-0 items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[14px] font-bold text-dim transition-colors hover:text-txt"
        >
          <Swatch dots={current.dots} />
          <span className="min-w-0 flex-1 truncate text-left">Skin · {current.name}</span>
          <span className="shrink-0 font-mono text-[8px] font-bold uppercase tracking-[0.12em] text-dim2">{modeLabel(current.mode)}</span>
        </button>
      )}
      {display === "fab" && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Choose your skin"
          title="Choose your skin"
          className={cn(
            "glass-hi fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] z-40 flex h-12 w-12 items-center justify-center rounded-full border border-line shadow-[var(--shadow)] transition-transform active:scale-90 lg:hidden",
            side === "left" ? "left-4" : "right-4",
          )}
        >
          <Swatch dots={current.dots} size={22} />
        </button>
      )}
      {display === "map" && (
        <button
          onClick={() => setOpen(true)}
          aria-label="Choose your skin"
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-line glass text-txt transition-transform active:scale-95"
        >
          <Swatch dots={current.dots} size={18} />
        </button>
      )}

      {mounted && wiping && createPortal(<div className="skin-wipe go" />, document.body)}

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h2 className="disp text-lg text-txt">Choose your skin</h2>
        <p className="mb-3 mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim2">
          Same gigs · your vibe · switches live
        </p>

        {/* One control for light/dark. Every theme below honours it, so a skin
            is still a single click: the card applies the theme in this state. */}
        <div
          role="radiogroup"
          aria-label="Light or dark"
          className="mb-4 flex gap-1 rounded-2xl border border-line bg-card p-1"
        >
          {(["light", "dark"] as SkinVariant[]).map((v) => {
            const on = variant === v;
            return (
              <button
                key={v}
                role="radio"
                aria-checked={on}
                onClick={() => { if (!on) pick(skinFor(theme, v)); }}
                className={cn(
                  "flex flex-1 items-center justify-center gap-2 rounded-xl px-3 py-2 text-[12.5px] font-bold transition-colors",
                  on ? "bg-acc text-on-acc" : "text-dim hover:text-txt",
                )}
              >
                <span
                  aria-hidden
                  className="h-3 w-3 rounded-full border"
                  style={v === "light"
                    ? { background: "#f8fafc", borderColor: "rgba(15,23,42,.35)" }
                    : { background: "#0b0d12", borderColor: "rgba(255,255,255,.45)" }}
                />
                {v === "light" ? "Light" : "Dark"}
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {THEMES.map((t) => {
            const key = skinFor(t.id, variant);
            const s = APP_SKINS[key];
            const cur = t.id === theme;
            return (
              <button
                key={t.id}
                onClick={() => pick(key)}
                aria-pressed={cur}
                className={cn(
                  "rounded-2xl border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 active:scale-[.98]",
                  cur ? "border-transparent outline outline-2 outline-offset-1 outline-[var(--acc)]" : "border-line",
                )}
              >
                <span className="mb-2 flex items-center justify-between gap-2">
                  <span className="flex gap-1">
                    {s.dots.map((c, i) => (
                      <span key={i} className="h-3.5 w-3.5 rounded-full border border-black/30" style={{ background: c }} />
                    ))}
                  </span>
                  <ModeBadge mode={s.mode} />
                </span>
                <span className="block text-[13.5px] font-bold text-txt">{t.name}</span>
                <span className="mt-0.5 block text-[10.5px] leading-snug text-dim2">{s.desc}</span>
                {cur && (
                  <span className="mt-1.5 block font-mono text-[8px] uppercase tracking-[0.15em] text-[var(--acc)]">
                    Current
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </Sheet>
    </>
  );
}
