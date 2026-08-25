"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CalendarRange, ChevronDown, ChevronRight, LocateFixed, MapPin, Search, X } from "lucide-react";
import { placesSuggest, placesDetails, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/domain/types";

export interface OriginChoice { loc: LatLng | null; label: string }

function tidy(label: string): string {
  return label.replace(/,\s*UK$/i, "").trim();
}

/** Inline location control  -  a chip that opens a dropdown (no modal).
 *  Town search runs through bndy's OWN Places proxy (same source as the
 *  wizard)  -  no client-side Google key, so it works in every build. */
export function LocationField({
  value,
  onChange,
  showFestivalsShortcut = true,
}: {
  value: OriginChoice;
  onChange: (o: OriginChoice) => void;
  /** Gigs uses this as a mobile discovery affordance. Festival pages suppress it. */
  showFestivalsShortcut?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const deb = useRef<number | undefined>(undefined);
  const usingCurrent = value.loc === null;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    window.clearTimeout(deb.current);
    let cancelled = false;
    if (q.trim().length < 2) {
      setPreds([]);
      setBusy(false);
      return () => { cancelled = true; };
    }
    deb.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const next = await placesSuggest(q, "town");
        if (!cancelled) setPreds(next);
      } catch {
        if (!cancelled) setPreds([]);
      } finally {
        if (!cancelled) setBusy(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(deb.current);
    };
  }, [q]);

  const pickCurrent = () => { onChange({ loc: null, label: "Current location" }); setOpen(false); setQ(""); };
  const pickPlace = async (p: PlaceSuggestion) => {
    const d = await placesDetails(p.placeId).catch(() => null);
    if (d && typeof d.lat === "number" && typeof d.lng === "number") {
      onChange({ loc: { lat: d.lat, lng: d.lng }, label: tidy(d.name || p.name) });
      setOpen(false);
      setQ("");
    }
  };

  return (
    <div ref={wrapRef} className="relative flex w-full min-w-0 items-stretch gap-2 lg:w-auto lg:shrink-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={cn("flex min-w-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[12.5px] font-extrabold transition-[border-color,background-color,transform] active:scale-[.99] lg:shrink-0", usingCurrent ? "border-line glass text-txt" : "border-[var(--acc)] bg-card2 text-txt")}
      >
        <MapPin size={14} className="shrink-0 text-[var(--acc)]" />
        <span className="min-w-0 truncate">{value.label}</span>
        {usingCurrent ? (
          <ChevronDown size={14} className={cn("shrink-0 text-dim transition-transform", open && "rotate-180")} />
        ) : (
          <span onClick={(e) => { e.stopPropagation(); pickCurrent(); }} className="shrink-0 rounded p-0.5 hover:bg-white/10" title="Reset to current location"><X size={13} /></span>
        )}
      </button>

      {showFestivalsShortcut && (
        <Link
          href="/festivals"
          aria-label="Explore festivals and music series"
          className="ml-auto flex shrink-0 items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[12px] font-black text-txt transition-transform active:scale-[.98] lg:hidden"
          style={{
            borderColor: "color-mix(in srgb, var(--acc) 52%, var(--line))",
            background: "linear-gradient(110deg, color-mix(in srgb, var(--acc) 18%, var(--glass)), color-mix(in srgb, var(--acc2) 10%, var(--glass)))",
          }}
        >
          <CalendarRange size={14} className="shrink-0 text-[var(--acc)]" strokeWidth={2.5} />
          <span>Festivals</span>
          <ChevronRight size={13} className="shrink-0 text-dim" strokeWidth={2.5} />
        </Link>
      )}

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[290px] max-w-[82vw] rounded-2xl border border-line-hi glass-hi p-2 shadow-[0_16px_50px_rgba(0,0,0,.6)]">
          <div className="relative mb-1">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              enterKeyHint="search"
              aria-label="Search UK towns and cities"
              placeholder="Search UK towns & cities…"
              className="w-full rounded-xl border border-line bg-white/5 px-8 py-2.5 text-[14px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
            />
          </div>
          <button onClick={pickCurrent} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] font-bold transition hover:bg-white/5 active:scale-[.99]">
            <LocateFixed size={16} className="text-[var(--acc)]" /> Current location
          </button>
          {(busy || preds.length > 0 || q.trim().length >= 2) && (
            <div className="mt-1 max-h-56 overscroll-contain overflow-y-auto">
              {busy && <div className="px-2.5 py-2 text-[13px] font-semibold text-dim">Searching…</div>}
              {preds.slice(0, 6).map((p) => (
                <button key={p.placeId} onClick={() => pickPlace(p)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/5 active:scale-[.99]">
                  <MapPin size={15} className="shrink-0 text-dim" />
                  <span className="min-w-0 truncate text-[13.5px] font-semibold">{tidy(p.name)}{p.address ? <span className="text-dim"> · {tidy(p.address) || "UK"}</span> : null}</span>
                </button>
              ))}
              {!busy && q.trim().length >= 2 && preds.length === 0 && <div className="px-2.5 py-2 text-[13px] font-semibold text-dim">No places found.</div>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
