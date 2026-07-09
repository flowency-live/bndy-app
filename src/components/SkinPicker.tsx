"use client";

// Skin picker — the user-facing "choose your skin" control.
// Spec: Projects/bndy/SKINS-SYSTEM-SPEC.md §3.5

import { useCallback, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { useTheme } from "@/lib/theme";
import { APP_SKINS, SKIN_ORDER, type AppSkinId } from "@/lib/appSkins";
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

export function SkinControl({ variant }: { variant: "sidebar" | "fab" }) {
  const [open, setOpen] = useState(false);
  const [wiping, setWiping] = useState(false);
  const { appSkin, setAppSkin } = useTheme();
  const current = APP_SKINS[appSkin];

  const pick = useCallback(
    (s: AppSkinId) => {
      setOpen(false);
      if (s === appSkin) return;
      setWiping(true);
      window.setTimeout(() => setAppSkin(s), 260);
      window.setTimeout(() => setWiping(false), 720);
    },
    [appSkin, setAppSkin],
  );

  return (
    <>
      {variant === "sidebar" ? (
        <div className="mt-auto">
          <button
            onClick={() => setOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl border border-line px-3 py-2.5 text-[14px] font-bold text-dim transition-colors hover:text-txt"
          >
            <Swatch dots={current.dots} />
            <span className="truncate">Skin · {current.name}</span>
          </button>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          aria-label="Choose your skin"
          className="glass-hi fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-line shadow-[var(--shadow)] transition-transform active:scale-90 lg:hidden"
        >
          <Swatch dots={current.dots} size={22} />
        </button>
      )}

      {wiping && <div className="skin-wipe go" />}

      <Sheet open={open} onClose={() => setOpen(false)}>
        <h2 className="disp text-lg text-txt">Choose your skin</h2>
        <p className="mb-4 mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-dim2">
          Same gigs · your vibe · switches live
        </p>
        <div className="grid grid-cols-2 gap-2.5 pb-2">
          {SKIN_ORDER.map((key) => {
            const s = APP_SKINS[key];
            const cur = key === appSkin;
            return (
              <button
                key={key}
                onClick={() => pick(key)}
                className={cn(
                  "rounded-[var(--rad)] border bg-card p-3 text-left transition-transform hover:-translate-y-0.5 active:scale-[.98]",
                  cur ? "border-transparent outline outline-2 outline-offset-1 outline-[var(--acc)]" : "border-line",
                )}
              >
                <span className="mb-2 flex gap-1">
                  {s.dots.map((c, i) => (
                    <span key={i} className="h-3.5 w-3.5 rounded-full border border-black/30" style={{ background: c }} />
                  ))}
                </span>
                <span className="block text-[13.5px] font-bold text-txt">{s.name}</span>
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
