"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin, Search, LocateFixed, ChevronDown, X } from "lucide-react";
import { usePlaces, type PlacePrediction } from "@/lib/usePlaces";
import { cn } from "@/lib/cn";
import type { LatLng } from "@/domain/types";

export interface OriginChoice { loc: LatLng | null; label: string }

/** Inline location control — a chip that opens a dropdown (no modal). */
export function LocationField({ value, onChange }: { value: OriginChoice; onChange: (o: OriginChoice) => void }) {
  const { available, ready, search, resolvePlace } = usePlaces();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [preds, setPreds] = useState<PlacePrediction[]>([]);
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
    if (!q.trim()) { setPreds([]); return; }
    deb.current = window.setTimeout(async () => { setBusy(true); setPreds(await search(q)); setBusy(false); }, 220);
    return () => window.clearTimeout(deb.current);
  }, [q, search]);

  const pickCurrent = () => { onChange({ loc: null, label: "Current location" }); setOpen(false); setQ(""); };
  const pickPlace = async (p: PlacePrediction) => {
    const r = await resolvePlace(p.id);
    if (r) { onChange({ loc: { lat: r.lat, lng: r.lng }, label: r.label }); setOpen(false); setQ(""); }
  };

  return (
    <div ref={wrapRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("flex items-center gap-1.5 rounded-2xl border px-3.5 py-2 text-[12.5px] font-extrabold", usingCurrent ? "border-line glass text-txt" : "border-[var(--acc)] bg-card2 text-txt")}
      >
        <MapPin size={14} className="text-[var(--acc)]" /> {value.label}
        {usingCurrent ? (
          <ChevronDown size={14} className={cn("text-dim transition-transform", open && "rotate-180")} />
        ) : (
          <span onClick={(e) => { e.stopPropagation(); pickCurrent(); }} className="rounded p-0.5 hover:bg-white/10" aria-label="Reset to current location"><X size={13} /></span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-[calc(100%+6px)] z-40 w-[290px] max-w-[82vw] rounded-2xl border border-line-hi glass-hi p-2 shadow-[0_16px_50px_rgba(0,0,0,.6)]">
          <div className="relative mb-1">
            <Search size={15} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dim" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              disabled={!available}
              aria-label="Search UK towns and cities"
              placeholder={available ? "Search UK towns & cities…" : "Location search unavailable"}
              className="w-full rounded-xl border border-line bg-white/5 px-8 py-2.5 text-[14px] font-semibold outline-none placeholder:text-dim focus:border-orange/55 disabled:opacity-60"
            />
          </div>
          <button onClick={pickCurrent} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left text-[13.5px] font-bold transition hover:bg-white/5">
            <LocateFixed size={16} className="text-[var(--acc)]" /> Current location
          </button>
          {available && (busy || preds.length > 0 || (ready && q.trim() !== "")) && (
            <div className="mt-1 max-h-56 overflow-y-auto">
              {busy && <div className="px-2.5 py-2 text-[13px] font-semibold text-dim">Searching…</div>}
              {preds.map((p) => (
                <button key={p.id} onClick={() => pickPlace(p)} className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-left transition hover:bg-white/5">
                  <MapPin size={15} className="shrink-0 text-dim" /><span className="truncate text-[13.5px] font-semibold">{p.label}</span>
                </button>
              ))}
              {!busy && ready && q.trim() !== "" && preds.length === 0 && <div className="px-2.5 py-2 text-[13px] font-semibold text-dim">No places found.</div>}
            </div>
          )}
          {!available && <p className="px-2.5 py-2 text-[11.5px] leading-relaxed text-dim2">Add <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable search.</p>}
        </div>
      )}
    </div>
  );
}
