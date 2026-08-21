"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Mic, Music, Plus, Search, X } from "lucide-react";
import { useArtists, useUpcomingGigs, useVenues } from "@/lib/hooks";
import { Avatar } from "@/components/ui/Avatar";
import { distanceMiles } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { useArtistTaxonomy } from "@/lib/artistTaxonomy";
import { MAX_ACTS, NEW_ACT_ID, REGIONS, rankArtists, type NewArtistDraft } from "./lib";
import { FacebookSourceAssist } from "./FacebookSourceAssist";
import { placesSuggest, resolveArtist, type ArtistCandidate, type FacebookSourceInspection, type PlaceSuggestion } from "./wizardApi";

/** WHO step. Candidates ALWAYS show location — the Ant Hill Mob defence: same-named
 *  acts are distinguishable by place, and same-region duplicates are impossible
 *  (not offered here, rejected server-side regardless). When the venue is already
 *  chosen, same-named acts nearest the venue rank first (gig-footprint proximity). */
export function StepArtist({ venueId, venueCity, initialOpenMic, bill, headlineIds, initialMultiAct, onPickExisting, onPickNew, onPickOpenMic, onBillChange, onBillDone }: {
  venueId?: string;
  venueCity?: string;
  /** resume state: the draft is already an open mic */
  initialOpenMic?: boolean;
  /** feature 12: the bill so far, act 1 first. Empty on a fresh gig. */
  bill?: { id: string; name: string }[];
  headlineIds?: string[];
  initialMultiAct?: boolean;

  onPickExisting: (a: { id: string; name: string }) => void;
  onPickNew: (draft: NewArtistDraft) => void;
  /** item 13: open mic night — no headline act; optional host already on bndy */
  onPickOpenMic: (host?: { id: string; name: string }) => void;
  /** feature 12: replace the whole bill and the headline set */
  onBillChange?: (acts: { id: string; name: string }[], headlineIds: string[], multiAct: boolean) => void;
  /** feature 12: leave the step once a bill is assembled */
  onBillDone?: () => void;
}) {
  const { data: artists = [] } = useArtists();
  const { data: gigs = [] } = useUpcomingGigs();
  const { data: venues = [] } = useVenues();
  const gigCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gigs) if (g.artistId) m.set(g.artistId, (m.get(g.artistId) ?? 0) + 1);
    return m;
  }, [gigs]);

  // Footprint proximity: one pass over the cached gigs when the venue changes,
  // artistId → miles to their nearest gig. Never recomputed per keystroke.
  const venueLoc = useMemo(() => venues.find((v) => v.id === venueId)?.location, [venues, venueId]);
  const distById = useMemo(() => {
    if (!venueLoc) return undefined;
    const m = new Map<string, number>();
    for (const g of gigs) {
      if (!g.artistId) continue;
      const d = distanceMiles(venueLoc, g.location);
      if (!isFinite(d)) continue;
      const prev = m.get(g.artistId);
      if (prev === undefined || d < prev) m.set(g.artistId, d);
    }
    return m;
  }, [gigs, venueLoc]);

  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  // item 13, Jason fix 2026-08-11: open mic is a VISIBLE TOGGLE on this step,
  // not a hidden sub-page. With it on, picking an act means "this act hosts it".
  const [openMic, setOpenMic] = useState(!!initialOpenMic);
  // Feature 12. OFF by default and that is the whole point: with the box clear,
  // pick() still auto-advances and a single-act gig is byte-for-byte unchanged.
  const [multiAct, setMultiAct] = useState(!!initialMultiAct || (bill?.length ?? 0) > 1);
  const acts = bill ?? [];
  const heads = headlineIds?.length ? headlineIds : acts.slice(0, 1).map((a) => a.id);
  const full = acts.length >= MAX_ACTS;
  const ranked = useMemo(() => rankArtists(q, artists, 8, { venueCity, distById }), [q, artists, venueCity, distById]);

  if (adding) {
    return <NewArtistForm initialName={q.trim()} onBack={() => setAdding(false)} onPickExisting={onPickExisting} onDone={onPickNew} />;
  }

  const pick = (a: { id: string; name: string }) => {
    if (openMic) return onPickOpenMic(a);
    if (!multiAct) return onPickExisting(a);          // unchanged fast path
    if (acts.some((x) => x.id === a.id) || full) return;
    // Act 1 defaults to headline. Acts 2 to 4 default to support.
    const next = [...acts, a];
    onBillChange?.(next, next.length === 1 ? [a.id] : heads, true);
    setQ("");
  };
  const removeAct = (id: string) => {
    const next = acts.filter((a) => a.id !== id);
    const nextHeads = heads.filter((h) => h !== id);
    // Removing act 1 promotes act 2, and a bill always keeps one headliner.
    onBillChange?.(next, nextHeads.length ? nextHeads : next.slice(0, 1).map((a) => a.id), true);
  };
  const toggleHeadline = (id: string) => {
    const on = heads.includes(id);
    const next = on ? heads.filter((h) => h !== id) : [...heads, id];
    onBillChange?.(acts, next.length ? next : [id], true);   // never leave zero headliners
  };

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">{openMic ? "Open mic night" : "Who's playing?"}</h2>

      {/* item 13: explicit toggle — the state is always visible */}
      <button
        onClick={() => setOpenMic((v) => { if (!v) setMultiAct(false); return !v; })}
        aria-pressed={openMic}
        title={openMic ? "Switch back to a normal gig" : "List this as an open mic night"}
        className={cn(
          "mt-3 flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors",
          openMic ? "border-[var(--acc2)] bg-card2" : "border-line glass hover:border-line-hi",
        )}
      >
        <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border", openMic ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {openMic && <Check size={12} strokeWidth={3.5} />}
        </span>
        <Mic size={16} className="shrink-0 text-[var(--acc2)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-extrabold">It&apos;s an open mic night</span>
          <span className="block text-[11.5px] font-semibold text-dim">No headline act needed. Host optional. Can repeat weekly or monthly.</span>
        </span>
      </button>

      {/* Feature 12. Deliberately smaller than the open mic toggle: that toggle
          changes what the gig IS, this one only changes how the step behaves. */}
      {!openMic && (
        <button
          onClick={() => { const v = !multiAct; setMultiAct(v); onBillChange?.(v ? acts : acts.slice(0, 1), acts.slice(0, v ? undefined : 1).map((a) => a.id), v); }}
          aria-pressed={multiAct}
          title="Add more than one act to this gig"
          className="mt-2.5 flex items-center gap-2.5 text-left text-[13px] font-bold text-dim transition-colors hover:text-txt"
        >
          <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded border", multiAct ? "border-transparent bg-acc text-on-acc" : "border-line-hi")}>
            {multiAct && <Check size={10} strokeWidth={3.5} />}
          </span>
          Several acts on this bill
        </button>
      )}

      {/* the bill so far */}
      {!openMic && acts.length > 0 && (multiAct || acts.length > 1) && (
        <div className="mt-3 space-y-1.5">
          {acts.map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2">
              <Avatar id={a.id} name={a.name} src={artists.find((x) => x.id === a.id)?.profileImageUrl ?? undefined} size={30} radius={9} />
              <span className="min-w-0 flex-1 truncate text-[14px] font-extrabold">
                {a.name}
                {a.id === NEW_ACT_ID && (
                  <span className="ml-1.5 rounded bg-card2 px-1 py-0.5 align-middle text-[9px] font-extrabold uppercase tracking-wide text-dim2">New</span>
                )}
              </span>
              <button onClick={() => toggleHeadline(a.id)} aria-pressed={heads.includes(a.id)}
                title={heads.includes(a.id) ? "Billed as headline. Tap to make it support." : "Billed as support. Tap to make it headline."}
                className={cn("shrink-0 rounded-md px-1.5 py-0.5 text-[9.5px] font-extrabold uppercase tracking-wide transition-colors",
                  heads.includes(a.id) ? "bg-acc/20 text-[var(--acc)]" : "bg-card2 text-dim hover:text-txt")}>
                {heads.includes(a.id) ? "Headline" : "Support"}
              </button>
              <button onClick={() => removeAct(a.id)} aria-label={`Remove ${a.name}`} title={`Remove ${a.name}`}
                className="shrink-0 text-dim2 transition-colors hover:text-txt">
                <X size={15} />
              </button>
            </div>
          ))}
        </div>
      )}

      {full ? (
        <p className="mt-3 text-[12.5px] font-semibold text-dim2">4 acts is the limit. A bigger bill is a festival.</p>
      ) : (
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={openMic ? "Host act (optional)…" : multiAct && acts.length ? "Add another act…" : "Artist or band name…"}
          aria-label={openMic ? "Search for the host act" : "Search for an artist"}
          autoFocus
          className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
        />
      </div>
      )}

      {ranked.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {ranked.filter(({ artist: a }) => !acts.some((x) => x.id === a.id)).map(({ artist: a }) => (
            <button key={a.id} onClick={() => pick({ id: a.id, name: a.name })}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-left transition-colors hover:border-line-hi">
              <Avatar id={a.id} name={a.name} src={a.profileImageUrl ?? undefined} size={38} radius={10} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{a.name}</span>
                <span className="block truncate text-[12px] font-semibold text-dim">
                  {a.location || "Location unknown"}
                  {gigCounts.get(a.id) ? ` · ${gigCounts.get(a.id)} upcoming` : ""}
                </span>
              </span>
              <span className="rounded-md bg-card2 px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-dim">
                {openMic ? "host" : "on bndy ✓"}
              </span>
            </button>
          ))}
        </div>
      )}

      {openMic ? (
        <>
          {q.trim().length >= 2 && ranked.length === 0 && (
            <p className="mt-3 text-[12.5px] font-semibold text-dim2">Not on bndy yet. Continue without a host; a curator can add one later.</p>
          )}
          <button onClick={() => onPickOpenMic(undefined)}
            className="bndy-btn mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[14px]">
            <Mic size={16} /> Continue{q.trim() ? " without a host" : ", no host"}
          </button>
        </>
      ) : multiAct && acts.length > 0 ? (
        <>
          {/* A new act must be act 1, so the location prompt and the duplicate
              checks run. Deliberate: no "add a new act" from bill mode. */}
          {q.trim().length >= 2 && ranked.length === 0 && (
            <p className="mt-3 text-[12.5px] font-semibold text-dim2">Not on bndy yet. Add the gig, then a curator can add this act to the bill.</p>
          )}
          {acts.length > 0 && (
            <button onClick={() => onBillDone?.()} className="bndy-btn mt-4 flex w-full items-center justify-center gap-2 py-3.5 text-[14px]">
              Next
            </button>
          )}
        </>
      ) : (
        q.trim().length >= 2 && (
          <button onClick={() => setAdding(true)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-hi py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt">
            <Plus size={15} /> {ranked.length ? `None of these? Add “${q.trim()}”` : `Add “${q.trim()}” to bndy`}
          </button>
        )
      )}
    </div>
  );
}

/** Strip Google's ", UK" suffix for storage: bndy locations are "Stoke-on-Trent", not "Stoke-on-Trent, UK". */
function cleanTown(label: string): string {
  return label.replace(/,\s*UK$/i, "").trim();
}

/** Shared field shell: label + control, one visual rhythm for the whole form. */
function Field({ label, hint, optional, children }: { label: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">
        {label}{optional && <span className="ml-1.5 font-bold normal-case tracking-normal text-dim2">optional</span>}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-[11.5px] font-semibold text-dim2">{hint}</span>}
    </div>
  );
}

const inputCls = "w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55";
const selectCls = "w-full appearance-none rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none focus:border-orange/55";

function NewArtistForm({ initialName, onBack, onPickExisting, onDone }: {
  initialName: string;
  onBack: () => void;
  onPickExisting: (a: { id: string; name: string }) => void;
  onDone: (draft: NewArtistDraft) => void;
}) {
  const { data: taxonomy } = useArtistTaxonomy();
  const [name, setName] = useState(initialName);
  const [locMode, setLocMode] = useState<"town" | "region">("town");
  const [townQ, setTownQ] = useState("");
  const [townPicked, setTownPicked] = useState<string | null>(null);
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const [region, setRegion] = useState("");
  const [artistType, setArtistType] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [verifiedSourceName, setVerifiedSourceName] = useState(false);
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [actType, setActType] = useState<string[]>([]);
  const [acoustic, setAcoustic] = useState(false);
  const [checking, setChecking] = useState(false);
  const [candidates, setCandidates] = useState<ArtistCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Town autocomplete via OUR Places proxy (kind=town) — no client-side Google key needed,
  // works regardless of build-env configuration, key stays server-side.
  const deb = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(deb.current);
    if (locMode !== "town" || townQ.trim().length < 2 || townPicked === townQ) { setPreds([]); return; }
    deb.current = window.setTimeout(async () => {
      try { setPreds(await placesSuggest(townQ, "town")); } catch { setPreds([]); }
    }, 220);
    return () => window.clearTimeout(deb.current);
  }, [townQ, townPicked, locMode]);
  const pickTown = (p: PlaceSuggestion) => {
    const clean = cleanTown(p.name);
    setTownQ(clean);
    setTownPicked(clean);
    setPreds([]);
  };

  const location = locMode === "town" ? (townPicked ?? townQ.trim()) : region;

  const toggleGenre = (g: string) => setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev);
  const toggleAct = (v: string) => setActType((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const extrasSummary = [
    genres.length ? genres.join(", ") : null,
    actType.length ? actType.map((v) => taxonomy.actTypes.find((t) => t.value === v)?.label ?? v).join(", ") : null,
    acoustic ? "Acoustic" : null,
  ].filter(Boolean).join(" · ");

  const applyFacebook = (result: FacebookSourceInspection) => {
    setError(null);
    if (result.facebookUrl) setFacebookUrl(result.facebookUrl);
    if (result.observed?.imageUrl) setProfileImageUrl(result.observed.imageUrl);
    if (result.observed?.name && result.evidence?.name === "facebook_html_meta") {
      setName(result.observed.name);
      setVerifiedSourceName(true);
    }
  };

  const draft = (confirmNew: boolean): NewArtistDraft => ({
    name: name.trim(),
    location,
    facebookUrl: facebookUrl.trim() || undefined,
    profileImageUrl,
    verifiedSourceName: verifiedSourceName || undefined,
    genres,
    actType: actType.length ? actType : undefined,
    acoustic: acoustic || undefined,
    artistType: artistType || undefined,
    confirmNew: confirmNew || undefined,
  });

  const canSubmit = !!name.trim() && !!location && !!artistType;

  const check = async () => {
    if (!name.trim() || !location) { setError(locMode === "town" ? "Name and home town are both needed." : "Name and a region are both needed."); return; }
    if (!artistType) { setError("Tell us what they are (band, duo, solo act...)."); return; }
    setChecking(true);
    setError(null);
    const r = await resolveArtist({
      name: name.trim(),
      location,
      facebookUrl: facebookUrl.trim() || undefined,
      profileImageUrl,
      verifiedSourceName: verifiedSourceName || undefined,
    }, { dryRun: true });
    setChecking(false);
    if (r.action === "matched" && r.artistId) {
      onPickExisting({ id: r.artistId, name: r.artistName ?? name.trim() });
    } else if (r.action === "review" && r.candidates.length) {
      setCandidates(r.candidates);
    } else if (r.action === "error" && r.code === "DATA_QUALITY") {
      setError(r.message ?? "That doesn't look like a single artist name. Use the act's own name, no line-ups or 'TBC'.");
    } else if (r.action === "error" && r.code === "LOCATION_UNRESOLVABLE") {
      setError("We couldn't place that location. Use a UK town or city, e.g. 'Stoke-on-Trent'.");
    } else {
      onDone(draft(false)); // clear to create at publish time
    }
  };

  if (candidates) {
    return (
      <div>
        <h2 className="text-[19px] font-black tracking-tight">Did you mean…?</h2>
        <p className="mt-1.5 text-[13px] font-semibold text-dim">These acts are already on bndy. Check the location.</p>
        <div className="mt-3 space-y-1.5">
          {candidates.map((c) => (
            <button key={c.id} onClick={() => onPickExisting({ id: c.id, name: c.name })}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-3 text-left transition-colors hover:border-line-hi">
              <Music size={15} className="shrink-0 text-[var(--acc)]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{c.name}</span>
                <span className="block text-[12px] font-semibold text-dim">{c.location || "Location unknown"}</span>
              </span>
              <Check size={16} className="text-dim2" />
            </button>
          ))}
        </div>
        <button onClick={() => onDone(draft(true))}
          className="mt-3.5 flex w-full items-center justify-center gap-2 rounded-xl border border-line-hi py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt">
          No, mine is a different act (based in {location || "another town"})
        </button>
        <p className="mt-2 text-[11.5px] font-semibold text-dim2">Same name AND same area = same act on bndy, so this only works if yours is somewhere else.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">Add a new artist</h2>
      <div className="mt-4 space-y-4">
        <FacebookSourceAssist
          expectedType="artist"
          value={facebookUrl}
          onChange={setFacebookUrl}
          onInspection={applyFacebook}
          onUseExisting={(entity) => onPickExisting({ id: entity.id, name: entity.name })}
          compact
        />

        <Field label="Name">
          <input value={name} onChange={(e) => { setName(e.target.value); setVerifiedSourceName(false); }} className={inputCls} />
        </Field>

        <Field
          label="Based in"
          hint={locMode === "town" ? "How we tell same-named acts apart." : "For acts that gig across a whole region."}
        >
          <div className="flex gap-2">
            {locMode === "town" ? (
              <div className="relative flex-1">
                <MapPin size={15} className="absolute left-3.5 top-[15px] text-dim" />
                <input
                  value={townQ}
                  onChange={(e) => { setTownQ(e.target.value); setTownPicked(null); }}
                  placeholder="Their home town…"
                  aria-label="Artist home town"
                  autoComplete="address-level2"
                  className={cn(inputCls, "pl-9", townPicked && "pr-9")}
                />
                {townPicked && <Check size={15} className="absolute right-3.5 top-[15px] text-[var(--acc)]" />}
                {preds.length > 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-line-hi glass-hi shadow-lg">
                    {preds.slice(0, 5).map((p) => (
                      <button key={p.placeId} onClick={() => pickTown(p)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/5">
                        <MapPin size={13} className="shrink-0 text-dim" />
                        <span className="min-w-0 truncate">{p.name}<span className="text-dim"> · {cleanTown(p.address) || "UK"}</span></span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex-1">
                <select value={region} onChange={(e) => setRegion(e.target.value)} aria-label="Artist home region" className={selectCls}>
                  <option value="">Choose a region…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
              </div>
            )}
            <div className="flex shrink-0 gap-1 self-start rounded-2xl border border-line p-1" role="group" aria-label="Location precision">
              {(["town", "region"] as const).map((m) => (
                <button key={m} onClick={() => setLocMode(m)} aria-pressed={locMode === m}
                  className={cn("rounded-xl px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors", locMode === m ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
                  {m === "town" ? "Town" : "Region"}
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="They are">
          <div className="relative">
            <select value={artistType} onChange={(e) => setArtistType(e.target.value)} aria-label="Artist type" className={selectCls}>
              <option value="">Choose one…</option>
              {taxonomy.artistTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
          </div>
        </Field>

        {profileImageUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-line bg-card2 p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={profileImageUrl} alt="" className="h-11 w-11 rounded-xl object-cover" />
            <div className="min-w-0 flex-1"><div className="text-[12px] font-black">Facebook photo found</div><div className="text-[11px] font-semibold text-dim">It will be offered to the backend if this artist is new.</div></div>
          </div>
        )}

        {/* Genres + act style live behind one calm accordion */}
        <div className="overflow-hidden rounded-2xl border border-line">
          <button onClick={() => setExtrasOpen((v) => !v)} aria-expanded={extrasOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="min-w-0 truncate text-[13px] font-extrabold">
              Genres &amp; style
              <span className="ml-2 font-semibold text-dim2">{extrasSummary || "optional"}</span>
            </span>
            <ChevronDown size={16} className={cn("shrink-0 text-dim transition-transform", extrasOpen && "rotate-180")} />
          </button>
          {extrasOpen && (
            <div className="space-y-4 border-t border-line px-4 pb-4 pt-3.5">
              <Field label="Genres" optional hint={genres.length >= 3 ? "That's the limit of 3." : "Pick up to 3."}>
                <div className="flex flex-wrap gap-1.5">
                  {taxonomy.genres.map((g) => (
                    <button key={g} onClick={() => toggleGenre(g)}
                      className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", genres.includes(g) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="They play" optional hint="Pick all that apply.">
                <div className="flex flex-wrap gap-1.5">
                  {taxonomy.actTypes.map((t) => (
                    <button key={t.value} onClick={() => toggleAct(t.value)}
                      className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors", actType.includes(t.value) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="They can perform" optional hint="A capability, separate from originals / covers / tribute.">
                <button
                  type="button"
                  onClick={() => setAcoustic((v) => !v)}
                  aria-pressed={acoustic}
                  className={cn(
                    "flex items-center gap-2.5 rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
                    acoustic ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt",
                  )}
                >
                  <span className={cn("flex h-4 w-4 items-center justify-center rounded border", acoustic ? "border-transparent bg-on-acc/15" : "border-line-hi")}>
                    {acoustic && <Check size={10} strokeWidth={3.5} />}
                  </span>
                  Acoustic
                </button>
              </Field>
            </div>
          )}
        </div>
      </div>

      {error && <p role="alert" className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-txt">{error}</p>}
      <div className="mt-4 flex gap-2.5">
        <button onClick={check} disabled={checking || !canSubmit}
          className="bndy-btn flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-40">
          {checking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Looks good
        </button>
        <button onClick={onBack} className="bndy-btn2 flex-1 py-3.5 text-[14px]">Back</button>
      </div>
    </div>
  );
}
