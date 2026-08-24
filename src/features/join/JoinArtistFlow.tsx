"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, MapPin, Music2, Search } from "lucide-react";
import { placesSuggest, resolveArtist, type ArtistCandidate, type PlaceSuggestion } from "@/features/wizard/wizardApi";

export function JoinArtistFlow() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pickedLocation, setPickedLocation] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [candidates, setCandidates] = useState<ArtistCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deb = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(deb.current);
    if (location.trim().length < 2 || pickedLocation === location) { setPlaces([]); return; }
    let cancelled = false;
    deb.current = window.setTimeout(async () => {
      const next = await placesSuggest(location, "town").catch(() => []);
      if (!cancelled) setPlaces(next);
    }, 220);
    return () => { cancelled = true; window.clearTimeout(deb.current); };
  }, [location, pickedLocation]);

  const search = async () => {
    if (!name.trim() || !location.trim()) return;
    setLoading(true); setError(null); setCandidates([]);
    try {
      const result = await resolveArtist({ name: name.trim(), location: pickedLocation ?? location.trim() }, { dryRun: true });
      setSearched(true);
      if (result.action === "review" || result.candidates.length) setCandidates(result.candidates);
      else if (result.action === "matched" && result.artistId) setCandidates([{ id: result.artistId, name: result.artistName ?? name.trim(), location: pickedLocation ?? location.trim() }]);
    } catch { setError("We couldn't check bndy just then. Try again — nothing has been created."); }
    finally { setLoading(false); }
  };

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <Link href="/join" className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Join bndy</Link>
      <header className="mt-7">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc text-on-acc"><Music2 size={21} /></span>
        <div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Artist · step one</div>
        <h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">First, let&apos;s find you.</h1>
        <p className="mt-3 text-[13px] font-semibold leading-relaxed text-dim">Tell us the artist name and where you&apos;re based or usually perform. We&apos;ll check canonical names and known variants before creating anything.</p>
      </header>

      <section className="mt-7 space-y-4 rounded-[26px] border border-line glass p-5 sm:p-6">
        <div>
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Artist or band name</label>
          <input autoFocus value={name} onChange={(e) => { setName(e.target.value); setSearched(false); }} placeholder="e.g. The Torrists" className="w-full rounded-2xl border border-line bg-transparent px-4 py-3.5 text-[15px] font-bold outline-none focus:border-[var(--acc)]" />
        </div>
        <div className="relative">
          <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Town, city or area</label>
          <div className="relative"><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" /><input value={location} onChange={(e) => { setLocation(e.target.value); setPickedLocation(null); setSearched(false); }} placeholder="e.g. Liverpool" className="w-full rounded-2xl border border-line bg-transparent py-3.5 pl-11 pr-4 text-[15px] font-bold outline-none focus:border-[var(--acc)]" /></div>
          {places.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-[var(--bg)] shadow-xl">{places.slice(0, 5).map((place) => <button key={place.placeId} type="button" onClick={() => { const value = place.name || place.address; setLocation(value); setPickedLocation(value); setPlaces([]); }} className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-white/5"><span className="block text-[12px] font-black">{place.name}</span><span className="block text-[10.5px] font-semibold text-dim">{place.address}</span></button>)}</div>}
        </div>
        <button type="button" disabled={!name.trim() || !location.trim() || loading} onClick={search} className="bndy-btn2 flex min-h-12 w-full items-center justify-center gap-2 px-5 text-[13px] disabled:opacity-40">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Check bndy</button>
      </section>

      {error && <p className="mt-4 rounded-2xl border border-red-500/30 px-4 py-3 text-[12px] font-bold text-red-500">{error}</p>}

      {searched && candidates.length > 0 && <section className="mt-7">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Possible matches</div>
        <h2 className="font-disp mt-1 text-[27px] font-black tracking-tight">Looks like you might already be on bndy 👋</h2>
        <p className="mt-2 text-[12px] font-semibold text-dim">Check the location carefully. Known name variants will appear here as the resolver starts returning them.</p>
        <div className="mt-4 space-y-2">{candidates.map((candidate) => <div key={candidate.id} className="rounded-[22px] border border-line glass p-4"><div className="flex items-start justify-between gap-4"><div><div className="text-[16px] font-black">{candidate.name}</div>{candidate.location && <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-dim"><MapPin size={12} /> {candidate.location}</div>}</div><Link href={`/artists/${candidate.id}`} className="text-[10px] font-black text-[var(--acc-text)]">View page</Link></div><button type="button" className="bndy-btn2 mt-4 flex min-h-10 w-full items-center justify-center gap-2 px-4 text-[12px]">That&apos;s us <ArrowRight size={14} /></button></div>)}</div>
        <button type="button" className="bndy-btn mt-3 min-h-11 w-full px-4 text-[12px]">None of these are us</button>
      </section>}

      {searched && candidates.length === 0 && !error && <section className="mt-7 rounded-[24px] border border-line glass p-5"><div className="font-meta text-[9px] font-black uppercase tracking-[1.4px] text-[var(--acc-text)]">No obvious match</div><h2 className="font-disp mt-1 text-[25px] font-black">You might be new here.</h2><p className="mt-2 text-[12px] font-semibold leading-relaxed text-dim">Good. Next we&apos;ll confirm a few details, sign you in if needed, and create the artist with you as its first owner.</p><button type="button" className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px]">Continue as a new artist <ArrowRight size={14} /></button></section>}
    </main>
  );
}
