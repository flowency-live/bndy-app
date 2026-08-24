"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Building2, Loader2, MapPin, Search } from "lucide-react";
import { placesDetails, placesSuggest, type PlaceSuggestion } from "@/features/wizard/wizardApi";

export function JoinVenueFlow() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlaceSuggestion | null>(null);
  const deb = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(deb.current);
    if (query.trim().length < 2 || selected?.name === query) { setPlaces([]); return; }
    let cancelled = false;
    deb.current = window.setTimeout(async () => {
      setLoading(true);
      const next = await placesSuggest(query, "venue").catch(() => []);
      if (!cancelled) { setPlaces(next); setLoading(false); }
    }, 220);
    return () => { cancelled = true; window.clearTimeout(deb.current); };
  }, [query, selected]);

  const choose = async (place: PlaceSuggestion) => {
    setSelected(place); setQuery(place.name); setPlaces([]); setLoading(true);
    const details = await placesDetails(place.placeId).catch(() => null);
    setLoading(false);
    if (details) setSelected({ placeId: details.placeId, name: details.name, address: details.address });
  };

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <Link href="/join" className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Join bndy</Link>
      <header className="mt-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc text-on-acc"><Building2 size={21} /></span>
        <div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Venue · step one</div>
        <h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">Which venue is yours?</h1>
        <p className="mt-3 text-[13px] font-semibold leading-relaxed text-dim">Start with the venue name. Place and address are part of its identity, so two pubs with the same name stay two different venues.</p>
      </header>

      <section className="mt-7 rounded-[26px] border border-line glass p-5 sm:p-6">
        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Venue name or place</label>
        <div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" /><input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} placeholder="e.g. The King's Arms, Warrington" className="w-full rounded-2xl border border-line bg-transparent py-3.5 pl-11 pr-11 text-[15px] font-bold outline-none focus:border-[var(--acc)]" />{loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-dim" />}</div>
        {places.length > 0 && <div className="mt-2 overflow-hidden rounded-2xl border border-line">{places.slice(0, 7).map((place) => <button key={place.placeId} type="button" onClick={() => choose(place)} className="flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-white/5"><MapPin size={15} className="mt-0.5 shrink-0 text-[var(--acc-text)]" /><span><span className="block text-[12px] font-black">{place.name}</span><span className="mt-0.5 block text-[10.5px] font-semibold text-dim">{place.address}</span></span></button>)}</div>}
      </section>

      {selected && <section className="mt-6 rounded-[24px] border border-[var(--acc)] glass p-5"><div className="font-meta text-[9px] font-black uppercase tracking-[1.4px] text-[var(--acc-text)]">Is this your venue?</div><h2 className="font-disp mt-1 text-[26px] font-black">{selected.name}</h2><p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold text-dim"><MapPin size={13} className="mt-0.5 shrink-0" /> {selected.address}</p><p className="mt-4 text-[11.5px] font-semibold leading-relaxed text-dim">Next we&apos;ll check this physical identity against bndy. If the venue already exists, we&apos;ll offer the Claim journey instead of making another copy.</p><button type="button" className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px]">Yes, this is the one <ArrowRight size={14} /></button></section>}
    </main>
  );
}
