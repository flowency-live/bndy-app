"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, CheckCircle2, Loader2, MapPin, Music2, Search } from "lucide-react";
import { AuthGate } from "@/features/auth/AuthGate";
import { placesSuggest, resolveArtist, type ArtistCandidate, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { joinArtist } from "./joinApi";
import { clearJoinState, readJoinState, saveJoinState } from "./joinState";

type Phase = "search" | "new" | "claim" | "success";

type JoinedArtist = { id: string; name: string; location?: string };

export function JoinArtistFlow() {
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [pickedLocation, setPickedLocation] = useState<string | null>(null);
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [candidates, setCandidates] = useState<ArtistCandidate[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>("search");
  const [claimCandidate, setClaimCandidate] = useState<ArtistCandidate | null>(null);
  const [joined, setJoined] = useState<JoinedArtist | null>(null);
  const deb = useRef<number | undefined>(undefined);

  useEffect(() => {
    const saved = readJoinState("artist");
    if (!saved) return;
    setName(saved.name);
    setLocation(saved.location ?? "");
    setPickedLocation(saved.location ?? null);
    if (saved.intent === "new") setPhase("new");
    if (saved.intent === "claim" && saved.entityId) {
      setClaimCandidate({ id: saved.entityId, name: saved.name, location: saved.location });
      setPhase("claim");
    }
  }, []);

  useEffect(() => {
    window.clearTimeout(deb.current);
    if (phase !== "search" || location.trim().length < 2 || pickedLocation === location) { setPlaces([]); return; }
    let cancelled = false;
    deb.current = window.setTimeout(async () => {
      const next = await placesSuggest(location, "town").catch(() => []);
      if (!cancelled) setPlaces(next);
    }, 220);
    return () => { cancelled = true; window.clearTimeout(deb.current); };
  }, [location, pickedLocation, phase]);

  const search = async () => {
    if (!name.trim() || !location.trim()) return;
    setLoading(true); setError(null); setCandidates([]);
    try {
      const loc = pickedLocation ?? location.trim();
      const result = await resolveArtist({ name: name.trim(), location: loc }, { dryRun: true });
      setSearched(true);
      if (result.action === "review" || result.candidates.length) setCandidates(result.candidates);
      else if (result.action === "matched" && result.artistId) {
        setCandidates([{ id: result.artistId, name: result.artistName ?? name.trim(), location: result.artistLocation ?? loc, matchedBy: result.matchedBy, matchedVariant: result.matchedVariant }]);
      }
    } catch { setError("We couldn't check bndy just then. Try again — nothing has been created."); }
    finally { setLoading(false); }
  };

  const startNew = () => {
    const loc = pickedLocation ?? location.trim();
    saveJoinState({ entityType: "artist", intent: "new", name: name.trim(), location: loc });
    setError(null);
    setPhase("new");
  };

  const startClaim = (candidate: ArtistCandidate) => {
    saveJoinState({ entityType: "artist", intent: "claim", name: candidate.name, location: candidate.location, entityId: candidate.id });
    setClaimCandidate(candidate);
    setError(null);
    setPhase("claim");
  };

  const createOwnedArtist = async () => {
    const loc = pickedLocation ?? location.trim();
    setLoading(true); setError(null);
    try {
      const result = await joinArtist({ name: name.trim(), location: loc });
      if (result.ok) {
        clearJoinState();
        setJoined({ id: result.artist.id, name: result.artist.name, location: result.artist.location ?? loc });
        setPhase("success");
        return;
      }
      if (result.kind === "existing") {
        const nextCandidates: ArtistCandidate[] = result.candidates.length
          ? result.candidates
          : result.artist
            ? [{ ...result.artist, matchedBy: result.matchedBy ?? undefined, matchedVariant: result.matchedVariant ?? undefined }]
            : [];
        setCandidates(nextCandidates);
        setSearched(true);
        setPhase("search");
        setError("Another matching artist appeared before we created yours. Nothing new was added — choose the existing page below.");
        return;
      }
      setError(result.message);
    } catch {
      setError("Network hiccup. Nothing was added — try again.");
    } finally { setLoading(false); }
  };

  if (phase === "success" && joined) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-10 lg:pt-14">
        <section className="text-center">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-acc text-on-acc"><CheckCircle2 size={30} /></span>
          <div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">You&apos;re on bndy</div>
          <h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">{joined.name}</h1>
          {joined.location && <p className="mt-2 flex items-center justify-center gap-1.5 text-[12px] font-bold text-dim"><MapPin size={13} /> {joined.location}</p>}
          <p className="mx-auto mt-4 max-w-md text-[13px] font-semibold leading-relaxed text-dim">The artist exists, your account is its owner, and the details you supplied have provenance in Backline. You can start managing the page now.</p>
          <div className="mx-auto mt-7 grid max-w-md gap-2 sm:grid-cols-2"><Link href={`/artists/${joined.id}`} className="bndy-btn2 flex min-h-11 items-center justify-center px-4 text-[12px]">View artist</Link><Link href="/join" className="bndy-btn flex min-h-11 items-center justify-center px-4 text-[12px]">Done</Link></div>
        </section>
      </main>
    );
  }

  if (phase === "new") {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
        <button type="button" onClick={() => setPhase("search")} className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Back to matches</button>
        <header className="mt-7"><div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">New artist · step two</div><h1 className="font-disp mt-1 text-[36px] font-black leading-none tracking-tight">Nice. Let&apos;s make it yours.</h1><p className="mt-3 text-[13px] font-semibold text-dim">We&apos;ve saved <b>{name}</b>{location ? <> · {location}</> : null}. Sign in and you&apos;ll come straight back here — no retyping.</p></header>
        <AuthGate title="Sign in to join bndy">
          <section className="mt-7 rounded-[24px] border border-[var(--acc)] glass p-5"><div className="flex items-start gap-3"><BadgeCheck size={21} className="mt-0.5 shrink-0 text-[var(--acc-text)]" /><div><div className="text-[15px] font-black">Ready to create {name}.</div><p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">We&apos;ll rerun the identity gate now. If somebody added the artist while you were signing in, we&apos;ll stop and show that page instead. Otherwise the artist and your owner relationship are created as one Join operation.</p></div></div>{error && <p className="mt-4 rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}<button type="button" disabled={loading} onClick={createOwnedArtist} className="bndy-btn2 mt-5 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-50">{loading ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Create my artist</button></section>
        </AuthGate>
      </main>
    );
  }

  if (phase === "claim" && claimCandidate) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
        <button type="button" onClick={() => setPhase("search")} className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Back to matches</button>
        <header className="mt-7"><div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Claim artist</div><h1 className="font-disp mt-1 text-[36px] font-black leading-none tracking-tight">Yep — that&apos;s already on bndy.</h1><p className="mt-3 text-[13px] font-semibold text-dim">Claiming connects your account to the existing page. It does not create another artist or overwrite anything before verification.</p></header>
        <section className="mt-6 rounded-[22px] border border-line glass p-4"><div className="text-[17px] font-black">{claimCandidate.name}</div>{claimCandidate.nameVariants && claimCandidate.nameVariants.length > 0 && <div className="mt-1 text-[11px] font-bold text-dim">Also known as: {claimCandidate.nameVariants.join(", ")}</div>}{claimCandidate.matchedVariant && <div className="mt-1 text-[11px] font-black text-[var(--acc-text)]">Matched your search as “{claimCandidate.matchedVariant}”</div>}{claimCandidate.location && <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-dim"><MapPin size={12} /> {claimCandidate.location}</div>}</section>
        <AuthGate title="Sign in to claim this artist"><section className="mt-6 rounded-[24px] border border-[var(--acc)] glass p-5"><div className="text-[15px] font-black">Ready to request the claim.</div><p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">The existing page stays untouched while the claim is verified. The Claim Request persistence/review endpoint is being built as the next backend slice.</p><button type="button" disabled className="bndy-btn2 mt-5 min-h-11 w-full px-4 text-[12px] opacity-55">Request claim</button></section></AuthGate>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <Link href="/join" className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Join bndy</Link>
      <header className="mt-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc text-on-acc"><Music2 size={21} /></span><div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Artist · step one</div><h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">First, let&apos;s find you.</h1><p className="mt-3 text-[13px] font-semibold leading-relaxed text-dim">Tell us the artist name and where you&apos;re based or usually perform. We&apos;ll check canonical names and known variants before creating anything.</p></header>
      <section className="mt-7 space-y-4 rounded-[26px] border border-line glass p-5 sm:p-6"><div><label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Artist or band name</label><input autoFocus value={name} onChange={(e) => { setName(e.target.value); setSearched(false); }} placeholder="e.g. The Torrists" className="w-full rounded-2xl border border-line bg-transparent px-4 py-3.5 text-[15px] font-bold outline-none focus:border-[var(--acc)]" /></div><div className="relative"><label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Town, city or area</label><div className="relative"><MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" /><input value={location} onChange={(e) => { setLocation(e.target.value); setPickedLocation(null); setSearched(false); }} placeholder="e.g. Liverpool" className="w-full rounded-2xl border border-line bg-transparent py-3.5 pl-11 pr-4 text-[15px] font-bold outline-none focus:border-[var(--acc)]" /></div>{places.length > 0 && <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-2xl border border-line bg-[var(--bg)] shadow-xl">{places.slice(0, 5).map((place) => <button key={place.placeId} type="button" onClick={() => { const value = place.name || place.address; setLocation(value); setPickedLocation(value); setPlaces([]); }} className="block w-full border-b border-line px-4 py-3 text-left last:border-0 hover:bg-white/5"><span className="block text-[12px] font-black">{place.name}</span><span className="block text-[10.5px] font-semibold text-dim">{place.address}</span></button>)}</div>}</div><button type="button" disabled={!name.trim() || !location.trim() || loading} onClick={search} className="bndy-btn2 flex min-h-12 w-full items-center justify-center gap-2 px-5 text-[13px] disabled:opacity-40">{loading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />} Check bndy</button></section>
      {error && <p className="mt-4 rounded-2xl border border-red-500/30 px-4 py-3 text-[12px] font-bold text-red-500">{error}</p>}
      {searched && candidates.length > 0 && <section className="mt-7"><div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Possible matches</div><h2 className="font-disp mt-1 text-[27px] font-black tracking-tight">Looks like you might already be on bndy 👋</h2><p className="mt-2 text-[12px] font-semibold text-dim">Check the location and known names carefully — same-name artists in different places stay separate.</p><div className="mt-4 space-y-2">{candidates.map((candidate) => <div key={candidate.id} className="rounded-[22px] border border-line glass p-4"><div className="flex items-start justify-between gap-4"><div><div className="text-[16px] font-black">{candidate.name}</div>{candidate.nameVariants && candidate.nameVariants.length > 0 && <div className="mt-1 text-[10.5px] font-bold text-dim">Also known as: {candidate.nameVariants.join(", ")}</div>}{candidate.matchedVariant && <div className="mt-1 text-[10.5px] font-black text-[var(--acc-text)]">Matched your search as “{candidate.matchedVariant}”</div>}{candidate.location && <div className="mt-1 flex items-center gap-1.5 text-[11px] font-bold text-dim"><MapPin size={12} /> {candidate.location}</div>}</div><Link href={`/artists/${candidate.id}`} className="text-[10px] font-black text-[var(--acc-text)]">View page</Link></div><button type="button" onClick={() => startClaim(candidate)} className="bndy-btn2 mt-4 flex min-h-10 w-full items-center justify-center gap-2 px-4 text-[12px]">That&apos;s us <ArrowRight size={14} /></button></div>)}</div><button type="button" onClick={() => { setCandidates([]); setSearched(true); }} className="bndy-btn mt-3 min-h-11 w-full px-4 text-[12px]">None of these are us</button></section>}
      {searched && candidates.length === 0 && !error && <section className="mt-7 rounded-[24px] border border-line glass p-5"><div className="font-meta text-[9px] font-black uppercase tracking-[1.4px] text-[var(--acc-text)]">No obvious match</div><h2 className="font-disp mt-1 text-[25px] font-black">You might be new here.</h2><p className="mt-2 text-[12px] font-semibold leading-relaxed text-dim">Good. Next we&apos;ll sign you in if needed, then create the artist and your management relationship without losing what you&apos;ve entered.</p><button type="button" onClick={startNew} className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px]">Continue as a new artist <ArrowRight size={14} /></button></section>}
    </main>
  );
}
