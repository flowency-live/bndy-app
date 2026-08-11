"use client";

// Town look-up for form fields. Same Google Places source as the map and
// /artists location controls (usePlaces). Free text still works when the
// look-up is unavailable, so the form never blocks.

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { usePlaces, type PlacePrediction } from "@/lib/usePlaces";

/** "Stoke-on-Trent, UK" → "Stoke-on-Trent" */
function tidy(label: string): string {
  return label.replace(/, UK$/i, "");
}

export function PlaceInput({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
}) {
  const { available, ready, search } = usePlaces();
  const [preds, setPreds] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const deb = useRef<number | undefined>(undefined);
  const skipNext = useRef(false);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!available) return;
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    window.clearTimeout(deb.current);
    if (!value.trim()) {
      setPreds([]);
      setOpen(false);
      return;
    }
    deb.current = window.setTimeout(async () => {
      setBusy(true);
      const r = await search(value);
      setPreds(r);
      setOpen(r.length > 0);
      setBusy(false);
    }, 220);
    return () => window.clearTimeout(deb.current);
  }, [value, search, available]);

  const pick = (p: PlacePrediction) => {
    skipNext.current = true;
    onChange(tidy(p.label));
    setPreds([]);
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={className}
        autoComplete={available ? "off" : autoComplete}
        aria-label={placeholder}
      />
      {open && ready && (
        <div className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-line-hi glass-hi p-1.5 shadow-[0_16px_50px_rgba(0,0,0,.6)]">
          {busy && <div className="px-2.5 py-2 text-[13px] font-semibold text-dim">Searching…</div>}
          {preds.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => pick(p)}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/5"
            >
              <MapPin size={15} className="shrink-0 text-dim" />
              <span className="truncate text-[13.5px] font-semibold">{p.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
