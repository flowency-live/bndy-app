"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BadgeCheck, Building2, CheckCircle2, Loader2, MapPin, Search } from "lucide-react";
import { AuthGate } from "@/features/auth/AuthGate";
import { placesDetails, placesSuggest, type PlaceDetails, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { checkJoinVenue, joinVenue, requestJoinClaim, type JoinVenueCandidate, type JoinVenueIdentity } from "./joinApi";
import { clearJoinState, readJoinState, saveJoinState } from "./joinState";
import { trackJoin } from "./joinAnalytics";

type Phase = "search" | "new" | "claim" | "success";

export function JoinVenueFlow() {
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<PlaceDetails | null>(null);
  const [candidate, setCandidate] = useState<JoinVenueCandidate | null>(null);
  const [phase, setPhase] = useState<Phase>("search");
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<{ id: string; name: string; address?: string } | null>(null);
  const [claimSubmitted, setClaimSubmitted] = useState(false);
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [facebook, setFacebook] = useState("");
  const [instagram, setInstagram] = useState("");
  const deb = useRef<number | undefined>(undefined);

  useEffect(() => {
    const saved = readJoinState("venue");
    if (!saved) return;
    setQuery(saved.name);
    if (saved.intent === "claim" && saved.entityId) {
      setCandidate({ id: saved.entityId, name: saved.name, address: saved.address, googlePlaceId: saved.googlePlaceId });
      setPhase("claim");
      return;
    }
    if (saved.intent === "new" && saved.googlePlaceId) {
      let cancelled = false;
      setLoading(true);
      placesDetails(saved.googlePlaceId)
        .then((details) => {
          if (cancelled) return;
          if (!details) {
            setPhase("search");
            setError("We need you to pick the venue once more so we can verify its exact location.");
            return;
          }
          setSelected(details);
          setQuery(details.name);
          setPhase("new");
        })
        .catch(() => {
          if (!cancelled) {
            setPhase("search");
            setError("We need you to pick the venue once more so we can verify its exact location.");
          }
        })
        .finally(() => { if (!cancelled) setLoading(false); });
      return () => { cancelled = true; };
    }
  }, []);

  useEffect(() => {
    window.clearTimeout(deb.current);
    if (phase !== "search" || query.trim().length < 2 || selected?.name === query) {
      setPlaces([]);
      return;
    }
    let cancelled = false;
    deb.current = window.setTimeout(async () => {
      setLoading(true);
      const next = await placesSuggest(query, "venue").catch(() => []);
      if (!cancelled) {
        setPlaces(next);
        setLoading(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(deb.current);
    };
  }, [query, selected, phase]);

  const choose = async (place: PlaceSuggestion) => {
    setQuery(place.name);
    setPlaces([]);
    setLoading(true);
    setError(null);
    const details = await placesDetails(place.placeId).catch(() => null);
    setLoading(false);
    if (!details) {
      setError("We couldn't load that place. Pick it again or try another result.");
      return;
    }
    setSelected(details);
  };

  const identity = (): JoinVenueIdentity | null => selected ? {
    name: selected.name,
    address: selected.address,
    city: selected.city,
    googlePlaceId: selected.placeId,
    latitude: selected.lat,
    longitude: selected.lng,
    website: website.trim() || undefined,
    phone: phone.trim() || undefined,
    socialMediaUrls: [facebook.trim(), instagram.trim()].filter(Boolean),
  } : null;

  const check = async () => {
    const value = identity();
    if (!value) return;
    setLoading(true);
    setError(null);
    setCandidate(null);
    trackJoin("identity_search_submitted", { entityType: "venue", step: "identity" });
    try {
      const result = await checkJoinVenue(value);
      if (result.existing) {
        trackJoin("existing_candidate_shown", { entityType: "venue", step: "identity" });
        trackJoin("claim_branch_entered", { entityType: "venue", step: "claim" });
        setCandidate(result.existing);
        saveJoinState({ entityType: "venue", intent: "claim", name: result.existing.name, address: result.existing.address, googlePlaceId: result.existing.googlePlaceId, entityId: result.existing.id });
        setPhase("claim");
      } else if (result.clear) {
        trackJoin("create_new_confirmed", { entityType: "venue", step: "identity" });
        saveJoinState({ entityType: "venue", intent: "new", name: value.name, address: value.address, googlePlaceId: value.googlePlaceId });
        setPhase("new");
      } else {
        setError(result.message ?? "We couldn't safely check that venue.");
      }
    } catch {
      setError("Network hiccup. Nothing was created. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submitClaim = async () => {
    if (!candidate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await requestJoinClaim({ entityType: "venue", entityId: candidate.id, requestedRole: "owner", evidenceHints: { address: candidate.address ?? "", googlePlaceId: candidate.googlePlaceId ?? "" } });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      clearJoinState();
      trackJoin("claim_requested", { entityType: "venue", step: "claim" });
      setClaimSubmitted(true);
    } catch {
      setError("Network hiccup. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const createOwnedVenue = async () => {
    const value = identity();
    if (!value) {
      setError("Please pick the venue from the place results again so we can verify its exact location.");
      setPhase("search");
      return;
    }
    setLoading(true);
    setError(null);
    const hasProfile = Boolean(website.trim() || phone.trim() || facebook.trim() || instagram.trim());
    trackJoin(hasProfile ? "profile_step_completed" : "profile_step_skipped", { entityType: "venue", step: "profile" });
    try {
      const result = await joinVenue(value);
      if (result.ok) {
        clearJoinState();
        trackJoin("entity_creation_completed", { entityType: "venue", result: "created" });
        trackJoin("join_completed", { entityType: "venue", result: "created" });
        setJoined({ id: result.venue.id, name: result.venue.name, address: result.venue.address });
        setPhase("success");
      } else if (result.kind === "existing") {
        trackJoin("entity_creation_duplicate_gated", { entityType: "venue", result: "existing" });
        if (result.venue) {
          setCandidate(result.venue);
          saveJoinState({ entityType: "venue", intent: "claim", name: result.venue.name, address: result.venue.address, googlePlaceId: result.venue.googlePlaceId, entityId: result.venue.id });
          setPhase("claim");
        } else {
          setPhase("search");
          setError("That venue now appears to exist in bndy. Search again so we can show you the right page.");
        }
      } else {
        setError(result.message);
      }
    } catch {
      setError("Network hiccup. Nothing was created. Try again.");
    } finally {
      setLoading(false);
    }
  };

  if (phase === "success" && joined) return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-10 lg:pt-14">
      <section className="text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-acc text-on-acc"><CheckCircle2 size={30} /></span>
        <div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">You&apos;re on bndy</div>
        <h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">{joined.name}</h1>
        {joined.address && <p className="mx-auto mt-2 flex max-w-md items-start justify-center gap-1.5 text-[12px] font-bold text-dim"><MapPin size={13} className="mt-0.5" /> {joined.address}</p>}
        <p className="mx-auto mt-4 max-w-md text-[13px] font-semibold leading-relaxed text-dim">Your venue is ready and linked to your account.</p>
        <div className="mx-auto mt-7 grid max-w-md gap-2 sm:grid-cols-2"><Link href={`/venues/${joined.id}`} className="bndy-btn2 flex min-h-11 items-center justify-center px-4 text-[12px]">View venue</Link><Link href="/manage" className="bndy-btn flex min-h-11 items-center justify-center px-4 text-[12px]">Manage</Link></div>
      </section>
    </main>
  );

  if (phase === "claim" && candidate) return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <button type="button" onClick={() => { setPhase("search"); setCandidate(null); setClaimSubmitted(false); }} className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim"><ArrowLeft size={14} /> Back to search</button>
      <header className="mt-7">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Claim venue</div>
        <h1 className="font-disp mt-1 text-[36px] font-black leading-none tracking-tight">That&apos;s already on bndy.</h1>
        <p className="mt-3 text-[13px] font-semibold text-dim">Is this your venue? Claim it to manage the page.</p>
      </header>
      <section className="mt-6 py-2">
        <div className="text-[17px] font-black">{candidate.name}</div>
        {candidate.address && <div className="mt-1 flex items-start gap-1.5 text-[11px] font-bold text-dim"><MapPin size={12} className="mt-0.5" /> {candidate.address}</div>}
      </section>
      <AuthGate title="Sign in to claim this venue">
        <section className="mt-5">
          {!claimSubmitted ? (
            <>
              <div className="text-[15px] font-black">Claim this venue</div>
              <p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">We&apos;ll send this to the bndy team for review.</p>
              {error && <p className="mt-4 rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}
              <button type="button" disabled={loading} onClick={submitClaim} className="bndy-btn2 mt-5 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-55">{loading && <Loader2 size={14} className="animate-spin" />} Claim this venue</button>
            </>
          ) : (
            <div className="rounded-[22px] bg-card2 p-5">
              <div className="flex items-center gap-2 text-[15px] font-black"><CheckCircle2 size={18} className="text-[var(--acc-text)]" /> Claim sent</div>
              <p className="mt-2 text-[12px] font-semibold leading-relaxed text-dim">The bndy team will review it. You can track the status in Manage.</p>
              <Link href="/manage" className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px]">Go to Manage <ArrowRight size={14} /></Link>
            </div>
          )}
        </section>
      </AuthGate>
    </main>
  );

  if (phase === "new") return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <button type="button" onClick={() => setPhase("search")} className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim"><ArrowLeft size={14} /> Back to venue</button>
      <header className="mt-7"><div className="font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">New venue · step two</div><h1 className="font-disp mt-1 text-[36px] font-black leading-none tracking-tight">Great. Let&apos;s make it yours.</h1><p className="mt-3 text-[13px] font-semibold text-dim">We couldn&apos;t find this physical venue in bndy. Sign in and we&apos;ll create it and link it to your account.</p></header>
      <AuthGate title="Sign in to join bndy">
        <section className="mt-7 rounded-[24px] border border-[var(--acc)] glass p-5">
          <div className="flex items-start gap-3"><BadgeCheck size={21} className="mt-0.5 text-[var(--acc-text)]" /><div><div className="text-[15px] font-black">Ready to create {selected?.name ?? query}.</div><p className="mt-1 text-[12px] font-semibold leading-relaxed text-dim">We&apos;ll check the place again before creating anything.</p></div></div>
          <div className="mt-5 border-t border-line pt-4"><div className="text-[11.5px] font-black">A little more about the venue <span className="font-semibold text-dim">· optional</span></div><p className="mt-1 text-[10.5px] font-semibold text-dim">Skip this if you want. We already have the venue identity.</p><div className="mt-3 grid gap-2 sm:grid-cols-2"><input value={website} onChange={(e) => setWebsite(e.target.value)} inputMode="url" placeholder="Website" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" /><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Phone" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" /><input value={facebook} onChange={(e) => setFacebook(e.target.value)} inputMode="url" placeholder="Facebook" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" /><input value={instagram} onChange={(e) => setInstagram(e.target.value)} inputMode="url" placeholder="Instagram" className="rounded-xl border border-line bg-transparent px-3 py-2.5 text-[12px] font-semibold outline-none focus:border-[var(--acc)]" /></div></div>
          {error && <p className="mt-4 rounded-xl border border-red-500/30 px-3 py-2 text-[11.5px] font-bold text-red-500">{error}</p>}
          <button type="button" disabled={loading || !selected} onClick={createOwnedVenue} className="bndy-btn2 mt-5 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px] disabled:opacity-50">{loading ? <Loader2 size={15} className="animate-spin" /> : <BadgeCheck size={15} />} Create my venue</button>
        </section>
      </AuthGate>
    </main>
  );

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-6 lg:pt-10">
      <Link href="/join" className="inline-flex items-center gap-1.5 text-[11px] font-black text-dim hover:text-[var(--acc-text)]"><ArrowLeft size={14} /> Join bndy</Link>
      <header className="mt-7"><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-acc text-on-acc"><Building2 size={21} /></span><div className="mt-5 font-meta text-[9px] font-black uppercase tracking-[1.6px] text-[var(--acc-text)]">Venue · step one</div><h1 className="font-disp mt-1 text-[38px] font-black leading-none tracking-tight">Which venue is yours?</h1><p className="mt-3 text-[13px] font-semibold leading-relaxed text-dim">Start with the venue name. Place and address are part of its identity, so two pubs with the same name stay two different venues.</p></header>
      <section className="mt-7 rounded-[26px] border border-line glass p-5 sm:p-6">
        <label className="mb-1.5 block text-[10px] font-black uppercase tracking-[1.2px] text-dim">Venue name or place</label>
        <div className="relative"><Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-dim" /><input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); setCandidate(null); setError(null); }} placeholder="e.g. The King's Arms, Warrington" className="w-full rounded-2xl border border-line bg-transparent py-3.5 pl-11 pr-11 text-[15px] font-bold outline-none focus:border-[var(--acc)]" />{loading && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin text-dim" />}</div>
        {places.length > 0 && <div className="mt-2 overflow-hidden rounded-2xl border border-line">{places.slice(0, 7).map((place) => <button key={place.placeId} type="button" onClick={() => choose(place)} className="flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-white/5"><MapPin size={15} className="mt-0.5 shrink-0 text-[var(--acc-text)]" /><span><span className="block text-[12px] font-black">{place.name}</span><span className="mt-0.5 block text-[10.5px] font-semibold text-dim">{place.address}</span></span></button>)}</div>}
      </section>
      {error && <p className="mt-4 rounded-2xl border border-red-500/30 px-4 py-3 text-[12px] font-bold text-red-500">{error}</p>}
      {selected && <section className="mt-6 rounded-[24px] border border-[var(--acc)] glass p-5"><div className="font-meta text-[9px] font-black uppercase tracking-[1.4px] text-[var(--acc-text)]">Is this your venue?</div><h2 className="font-disp mt-1 text-[26px] font-black">{selected.name}</h2><p className="mt-1 flex items-start gap-1.5 text-[11.5px] font-semibold text-dim"><MapPin size={13} className="mt-0.5 shrink-0" /> {selected.address}</p>{selected.typeWarning && <p className="mt-3 rounded-xl border border-amber-500/30 px-3 py-2 text-[11px] font-bold text-amber-600">{selected.typeWarning}</p>}<p className="mt-4 text-[11.5px] font-semibold leading-relaxed text-dim">We&apos;ll check this exact place against bndy before deciding whether to create or claim.</p><button type="button" disabled={loading} onClick={check} className="bndy-btn2 mt-4 flex min-h-11 w-full items-center justify-center gap-2 px-4 text-[12px]">{loading ? <Loader2 size={14} className="animate-spin" /> : null} Yes, this is the one <ArrowRight size={14} /></button></section>}
    </main>
  );
}
