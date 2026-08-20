"use client";

import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import { placesSuggest, type PlaceSuggestion } from "@/features/wizard/wizardApi";

function tidy(label: string): string {
  return label.replace(/,\s*UK$/i, "").trim();
}

export function PlaceInput({
  value,
  onChange,
  placeholder,
  className,
  autoComplete,
  ariaLabel,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
  autoComplete?: string;
  ariaLabel?: string;
}) {
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const deb = useRef<number | undefined>(undefined);
  const skipNext = useRef(false);
  const listId = "bndy-place-suggestions";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    window.clearTimeout(deb.current);
    let cancelled = false;
    if (value.trim().length < 2) {
      setPreds([]);
      setOpen(false);
      setBusy(false);
      return () => { cancelled = true; };
    }
    deb.current = window.setTimeout(async () => {
      setBusy(true);
      try {
        const r = await placesSuggest(value, "town");
        if (!cancelled) {
          setPreds(r);
          setOpen(r.length > 0);
        }
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
  }, [value]);

  const pick = (p: PlaceSuggestion) => {
    skipNext.current = true;
    onChange(tidy(p.name));
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
        autoComplete={autoComplete}
        role="combobox"
        aria-label={ariaLabel || placeholder || "Search for a place"}
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
      />
      {open && (
        <div id={listId} role="listbox" aria-label="Place suggestions" className="absolute left-0 right-0 top-[calc(100%+6px)] z-50 max-h-56 overflow-y-auto rounded-xl border border-line-hi glass-hi p-1.5 shadow-[0_16px_50px_rgba(0,0,0,.6)]">
          {busy && <div role="status" className="px-2.5 py-2 text-[13px] font-semibold text-dim">Searching…</div>}
          {preds.slice(0, 5).map((p) => (
            <button key={p.placeId} type="button" role="option" aria-selected="false" onClick={() => pick(p)} className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left transition hover:bg-white/5">
              <MapPin size={15} className="shrink-0 text-dim" />
              <span className="min-w-0 truncate text-[13.5px] font-semibold">
                {tidy(p.name)}{p.address ? <span className="text-dim"> · {tidy(p.address) || "UK"}</span> : null}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
