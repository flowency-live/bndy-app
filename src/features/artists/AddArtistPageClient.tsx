"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Check, CheckCircle2, ChevronDown, Loader2, MapPin, Music2, RotateCcw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/cn";
import { useArtistTaxonomy } from "@/lib/artistTaxonomy";
import { FacebookSourceAssist } from "@/features/wizard/FacebookSourceAssist";
import { REGIONS } from "@/features/wizard/lib";
import {
  placesSuggest,
  resolveArtist,
  type ArtistCandidate,
  type FacebookSourceInspection,
  type PlaceSuggestion,
} from "@/features/wizard/wizardApi";

const inputCls = "w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-[var(--acc)]";
const selectCls = "w-full appearance-none rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none focus:border-[var(--acc)]";

function cleanTown(label: string): string {
  return label.replace(/,\s*UK$/i, "").trim();
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">{label}</label>
      {children}
      {hint && <p className="mt-1.5 text-[11.5px] font-semibold text-dim">{hint}</p>}
    </div>
  );
}

type Success = { id: string; name: string; existing: boolean };

export function AddArtistPageClient() {
  const taxonomy = useArtistTaxonomy().data;
  const queryClient = useQueryClient();
  const [formKey, setFormKey] = useState(0);
  const [facebookInput, setFacebookInput] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [verifiedSourceName, setVerifiedSourceName] = useState(false);
  const [name, setName] = useState("");
  const [locMode, setLocMode] = useState<"town" | "region">("town");
  const [townQ, setTownQ] = useState("");
  const [townPicked, setTownPicked] = useState<string | null>(null);
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const [region, setRegion] = useState("");
  const [artistType, setArtistType] = useState("");
  const [phase, setPhase] = useState<"idle" | "saving">("idle");
  const [error, setError] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<ArtistCandidate[]>([]);
  const [success, setSuccess] = useState<Success | null>(null);
  const deb = useRef<number | undefined>(undefined);

  useEffect(() => {
    window.clearTimeout(deb.current);
    let cancelled = false;
    if (locMode !== "town" || townQ.trim().length < 2 || townPicked === townQ) {
      setPreds([]);
      return () => { cancelled = true; };
    }
    deb.current = window.setTimeout(async () => {
      try {
        const next = await placesSuggest(townQ, "town");
        if (!cancelled) setPreds(next);
      } catch {
        if (!cancelled) setPreds([]);
      }
    }, 220);
    return () => {
      cancelled = true;
      window.clearTimeout(deb.current);
    };
  }, [townQ, townPicked, locMode]);

  const location = locMode === "town" ? (townPicked ?? townQ.trim()) : region;
  const canSave = !!name.trim() && !!location && !!artistType && phase !== "saving";

  const applyInspection = (result: FacebookSourceInspection) => {
    setError(null);
    setCandidates([]);
    if (result.facebookUrl) {
      setFacebookUrl(result.facebookUrl);
      setFacebookInput(result.facebookUrl);
    }
    if (result.observed?.imageUrl) setProfileImageUrl(result.observed.imageUrl);

    const sourceName = result.observed?.name?.trim();
    const sourceNameEvidence = result.evidence?.name;
    if (sourceName && ["facebook_html_meta", "facebook_basic_html", "facebook_handle_hint"].includes(sourceNameEvidence ?? "")) {
      setName(sourceName);
      // A real Facebook title is observed source data. A name reconstructed from
      // the handle is only a convenience hint and must still pass normal name
      // quality checks if the user leaves it unchanged.
      setVerifiedSourceName(sourceNameEvidence !== "facebook_handle_hint");
    }

    if (result.observed?.location && result.evidence?.location === "bndy_existing_artist") {
      setLocMode("town");
      setTownQ(result.observed.location);
      setTownPicked(result.observed.location);
    }
  };

  const save = async (opts?: { resolveTo?: string; confirmNew?: boolean }) => {
    if (!canSave && !opts?.resolveTo) return;
    setPhase("saving");
    setError(null);
    try {
      const result = await resolveArtist({
        name: name.trim(),
        location,
        // FacebookSourceAssist only writes a resolved canonical identity into
        // parent state. Never fall back to unverified scratch/paste text here.
        facebookUrl: facebookUrl || undefined,
        profileImageUrl,
        verifiedSourceName: verifiedSourceName || undefined,
        artistType,
        genres: [],
      }, opts);

      if ((result.action === "matched" || result.action === "created") && result.artistId) {
        setSuccess({ id: result.artistId, name: result.artistName ?? name.trim(), existing: result.action === "matched" });
        setCandidates([]);
        queryClient.invalidateQueries({ queryKey: ["artists"] });
      } else if (result.action === "review" && result.candidates.length) {
        setCandidates(result.candidates);
      } else {
        setError(result.message ?? "We couldn't add that artist. Check the details and try again.");
      }
    } catch {
      setError("Network hiccup. Nothing was added — try again.");
    } finally {
      setPhase("idle");
    }
  };

  const reset = () => {
    setFacebookInput("");
    setFacebookUrl("");
    setProfileImageUrl(undefined);
    setVerifiedSourceName(false);
    setName("");
    setLocMode("town");
    setTownQ("");
    setTownPicked(null);
    setPreds([]);
    setRegion("");
    setArtistType("");
    setError(null);
    setCandidates([]);
    setSuccess(null);
    setFormKey((value) => value + 1);
  };

  if (success) {
    return (
      <main className="mx-auto max-w-xl px-4 pb-36 pt-8 lg:pt-12">
        <div className="py-8 text-center sm:py-12">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-acc text-on-acc"><CheckCircle2 size={26} /></span>
          <div className="mt-4 font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">{success.existing ? "Already on bndy" : "Artist added"}</div>
          <h1 className="mt-1 text-[28px] font-black tracking-tight">{success.name}</h1>
          <p className="mx-auto mt-2 max-w-md text-[13px] font-semibold text-dim">
            {success.existing ? "That Facebook page already belongs to an artist in bndy." : "They're in bndy and available for gigs. New public records still go through normal review."}
          </p>
          <div className="mx-auto mt-6 grid max-w-md gap-2 sm:grid-cols-2">
            <Link href={`/artists/${success.id}`} className="bndy-btn2 flex min-h-11 items-center justify-center px-4 text-[13px]">View artist</Link>
            <button type="button" onClick={reset} className="bndy-btn flex min-h-11 items-center justify-center gap-2 px-4 text-[13px]"><RotateCcw size={14} /> Add another artist</button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-36 pt-5 lg:pt-9">
      <header className="mb-7">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.8px] text-[var(--acc-text)]">Help grow bndy</div>
        <h1 className="font-disp mt-1 text-[34px] font-black leading-none tracking-tight">Add an artist</h1>
        <p className="mt-3 max-w-lg text-[13px] font-semibold leading-relaxed text-dim">Got their Facebook page? Paste it first and we&apos;ll fill what we can. If Facebook gives us nothing useful, the normal form still works.</p>
      </header>

      <div key={formKey} className="space-y-5">
        <FacebookSourceAssist
          expectedType="artist"
          value={facebookInput}
          onChange={(value) => { setFacebookInput(value); if (value !== facebookUrl) setFacebookUrl(""); }}
          onInspection={applyInspection}
          onUseExisting={(entity) => setSuccess({ id: entity.id, name: entity.name, existing: true })}
          flat
        />

        <Field label="Artist or band name">
          <input value={name} onChange={(event) => { setName(event.target.value); setVerifiedSourceName(false); }} className={inputCls} autoComplete="organization" />
        </Field>

        <Field label="Based in" hint="This is how bndy tells same-named acts apart.">
          <div className="flex gap-2">
            {locMode === "town" ? (
              <div className="relative min-w-0 flex-1">
                <MapPin size={15} className="absolute left-3.5 top-[15px] text-dim" />
                <input
                  value={townQ}
                  onChange={(event) => { setTownQ(event.target.value); setTownPicked(null); }}
                  placeholder="Their home town…"
                  aria-label="Artist home town"
                  autoComplete="address-level2"
                  className={cn(inputCls, "pl-9", townPicked && "pr-9")}
                />
                {townPicked && <Check size={15} className="absolute right-3.5 top-[15px] text-[var(--acc)]" />}
                {preds.length > 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-line-hi glass-hi shadow-lg">
                    {preds.slice(0, 5).map((place) => (
                      <button key={place.placeId} type="button" onClick={() => {
                        const town = cleanTown(place.name);
                        setTownQ(town);
                        setTownPicked(town);
                        setPreds([]);
                      }} className="flex min-h-11 w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/5">
                        <MapPin size={13} className="shrink-0 text-dim" />
                        <span className="min-w-0 truncate">{place.name}<span className="text-dim"> · {cleanTown(place.address) || "UK"}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative min-w-0 flex-1">
                <select value={region} onChange={(event) => setRegion(event.target.value)} aria-label="Artist home region" className={selectCls}>
                  <option value="">Choose a region…</option>
                  {REGIONS.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
              </div>
            )}
            <div className="flex shrink-0 gap-1 self-start rounded-2xl border border-line p-1" role="group" aria-label="Location precision">
              {(["town", "region"] as const).map((mode) => (
                <button key={mode} type="button" onClick={() => setLocMode(mode)} aria-pressed={locMode === mode}
                  className={cn("min-h-9 rounded-xl px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors", locMode === mode ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
                  {mode === "town" ? "Town" : "Region"}
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="They are">
          <div className="relative">
            <select value={artistType} onChange={(event) => setArtistType(event.target.value)} aria-label="Artist type" className={selectCls}>
              <option value="">Choose one…</option>
              {taxonomy.artistTypes.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
          </div>
        </Field>

        {profileImageUrl && (
          <div className="flex items-center gap-3 border-l-2 border-[var(--acc)] py-1 pl-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profileImageUrl} alt="" className="h-12 w-12 rounded-xl object-cover" />
            <div className="min-w-0 flex-1"><div className="text-[12px] font-black">Facebook photo found</div><div className="text-[11px] font-semibold text-dim">We&apos;ll use it if the artist is created.</div></div>
          </div>
        )}

        {candidates.length > 0 && (
          <section className="border-t border-line pt-4" aria-live="polite">
            <div className="text-[13px] font-black">Is it one of these?</div>
            <p className="mt-0.5 text-[11.5px] font-semibold text-dim">Same or similar artists already exist. Check the location before creating another.</p>
            <div className="mt-3 divide-y divide-line border-y border-line">
              {candidates.map((candidate) => (
                <button key={candidate.id} type="button" onClick={() => void save({ resolveTo: candidate.id })} className="flex min-h-12 w-full items-center gap-2.5 px-1 py-3 text-left transition-colors hover:bg-card2">
                  <Music2 size={14} className="shrink-0 text-[var(--acc)]" />
                  <span className="min-w-0 flex-1"><span className="block truncate text-[13.5px] font-extrabold">{candidate.name}</span><span className="block truncate text-[11px] font-semibold text-dim">{candidate.location || "Location unknown"}</span></span>
                  <span className="text-[10px] font-black uppercase tracking-wide text-[var(--acc-text)]">Use</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => void save({ confirmNew: true })} className="mt-3 min-h-11 w-full rounded-xl border border-line-hi px-3 py-2.5 text-[12px] font-black text-txt hover:bg-card2">No — this is a different artist</button>
          </section>
        )}

        {error && <p role="alert" className="border-l-2 border-[var(--acc)] py-1 pl-3 text-[12.5px] font-bold text-txt">{error}</p>}

        <button type="button" onClick={() => void save()} disabled={!canSave || candidates.length > 0} className="bndy-btn flex min-h-12 w-full items-center justify-center gap-2 px-4 text-[14px] disabled:opacity-45">
          {phase === "saving" ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Add artist
        </button>
      </div>
    </main>
  );
}
