"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, MapPin, Music, Plus, Search } from "lucide-react";
import { useArtists, useUpcomingGigs, useVenues } from "@/lib/hooks";
import { usePlaces, type PlacePrediction } from "@/lib/usePlaces";
import { Avatar } from "@/components/ui/Avatar";
import { distanceMiles } from "@/domain/geo";
import { cn } from "@/lib/cn";
import { ACT_TYPES, ARTIST_TYPES, GENRES, REGIONS, rankArtists, type NewArtistDraft } from "./lib";
import { resolveArtist, type ArtistCandidate } from "./wizardApi";

/** WHO step. Candidates ALWAYS show location — the Ant Hill Mob defence: same-named
 *  acts are distinguishable by place, and same-region duplicates are impossible
 *  (not offered here, rejected server-side regardless). When the venue is already
 *  chosen, same-named acts nearest the venue rank first (gig-footprint proximity). */
export function StepArtist({ venueId, venueCity, onPickExisting, onPickNew }: {
  venueId?: string;
  venueCity?: string;
  onPickExisting: (a: { id: string; name: string }) => void;
  onPickNew: (draft: NewArtistDraft) => void;
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
  const ranked = useMemo(() => rankArtists(q, artists, 8, { venueCity, distById }), [q, artists, venueCity, distById]);

  if (adding) {
    return <NewArtistForm initialName={q.trim()} onBack={() => setAdding(false)} onPickExisting={onPickExisting} onDone={onPickNew} />;
  }

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">Who&apos;s playing?</h2>
      <div className="relative mt-3">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Artist or band name…"
          aria-label="Search for an artist"
          autoFocus
          className="w-full rounded-2xl border border-line glass px-10 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55"
        />
      </div>

      {ranked.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {ranked.map(({ artist: a }) => (
            <button key={a.id} onClick={() => onPickExisting({ id: a.id, name: a.name })}
              className="flex w-full items-center gap-3 rounded-xl border border-line bg-card px-3.5 py-2.5 text-left transition-colors hover:border-line-hi">
              <Avatar id={a.id} name={a.name} src={a.profileImageUrl ?? undefined} size={38} radius={10} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[14.5px] font-extrabold">{a.name}</span>
                <span className="block truncate text-[12px] font-semibold text-dim">
                  {a.location || "Location unknown"}
                  {gigCounts.get(a.id) ? ` · ${gigCounts.get(a.id)} upcoming` : ""}
                </span>
              </span>
              <span className="rounded-md bg-card2 px-2 py-1 text-[9.5px] font-extrabold uppercase tracking-wide text-dim">on bndy ✓</span>
            </button>
          ))}
        </div>
      )}

      {q.trim().length >= 2 && (
        <button onClick={() => setAdding(true)}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-hi py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt">
          <Plus size={15} /> {ranked.length ? `None of these? Add “${q.trim()}”` : `Add “${q.trim()}” to bndy`}
        </button>
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
  const [name, setName] = useState(initialName);
  const [locMode, setLocMode] = useState<"town" | "region">("town");
  const [townQ, setTownQ] = useState("");
  const [townPicked, setTownPicked] = useState<string | null>(null);
  const [preds, setPreds] = useState<PlacePrediction[]>([]);
  const [region, setRegion] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [extrasOpen, setExtrasOpen] = useState(false);
  const [genres, setGenres] = useState<string[]>([]);
  const [artistType, setArtistType] = useState("");
  const [actType, setActType] = useState<string[] | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [candidates, setCandidates] = useState<ArtistCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Google Places town autocomplete (same key/loader as the gigs-list location filter).
  // `ready` is a dependency: if the script finishes loading AFTER the user typed,
  // the search re-runs — without this the dropdown silently never appears.
  const { available: placesAvailable, ready: placesReady, search } = usePlaces();
  const deb = useRef<number | undefined>(undefined);
  useEffect(() => {
    window.clearTimeout(deb.current);
    if (locMode !== "town" || !placesReady || townQ.trim().length < 2 || townPicked === townQ) { setPreds([]); return; }
    deb.current = window.setTimeout(async () => setPreds(await search(townQ)), 220);
    return () => window.clearTimeout(deb.current);
  }, [townQ, townPicked, locMode, placesReady, search]);
  const pickTown = (p: PlacePrediction) => {
    const clean = cleanTown(p.label);
    setTownQ(clean);
    setTownPicked(clean);
    setPreds([]);
  };

  const location = locMode === "town" ? (townPicked ?? townQ.trim()) : region;

  const toggleGenre = (g: string) => setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev);

  const extrasSummary = [
    genres.length ? genres.join(", ") : null,
    artistType || null,
    actType ? ACT_TYPES.find((t) => t.value.join() === actType.join())?.label : null,
  ].filter(Boolean).join(" · ");

  const draft = (confirmNew: boolean): NewArtistDraft => ({
    name: name.trim(),
    location,
    facebookUrl: facebookUrl.trim() || undefined,
    genres,
    actType,
    artistType: artistType || undefined,
    confirmNew: confirmNew || undefined,
  });

  const check = async () => {
    if (!name.trim() || !location) { setError(locMode === "town" ? "Name and home town are both needed." : "Name and a region are both needed."); return; }
    setChecking(true);
    setError(null);
    const r = await resolveArtist({ name: name.trim(), location, facebookUrl: facebookUrl.trim() || undefined }, { dryRun: true });
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
        <Field label="Name">
          <input value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
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
                  className={cn(inputCls, "pl-9", townPicked && "pr-9")}
                />
                {townPicked && <Check size={15} className="absolute right-3.5 top-[15px] text-[var(--acc)]" />}
                {preds.length > 0 && (
                  <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-line-hi glass-hi shadow-lg">
                    {preds.slice(0, 5).map((p) => (
                      <button key={p.id} onClick={() => pickTown(p)}
                        className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/5">
                        <MapPin size={13} className="shrink-0 text-dim" /> {p.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="relative flex-1">
                <select value={region} onChange={(e) => setRegion(e.target.value)} className={selectCls}>
                  <option value="">Choose a region…</option>
                  {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
              </div>
            )}
            <div className="flex shrink-0 gap-1 self-start rounded-2xl border border-line p-1">
              {(["town", "region"] as const).map((m) => (
                <button key={m} onClick={() => setLocMode(m)}
                  className={cn("rounded-xl px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors", locMode === m ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
                  {m === "town" ? "Town" : "Region"}
                </button>
              ))}
            </div>
          </div>
        </Field>

        <Field label="Facebook page" optional hint="We'll pull their photo and details from it.">
          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="facebook.com/…" inputMode="url" className={inputCls} />
        </Field>

        {/* Everything else lives behind one calm accordion */}
        <div className="overflow-hidden rounded-2xl border border-line">
          <button onClick={() => setExtrasOpen((v) => !v)} aria-expanded={extrasOpen}
            className="flex w-full items-center justify-between px-4 py-3 text-left">
            <span className="text-[13px] font-extrabold">
              Genres &amp; type
              <span className="ml-2 font-semibold text-dim2">{extrasSummary || "optional"}</span>
            </span>
            <ChevronDown size={16} className={cn("shrink-0 text-dim transition-transform", extrasOpen && "rotate-180")} />
          </button>
          {extrasOpen && (
            <div className="space-y-4 border-t border-line px-4 pb-4 pt-3.5">
              <Field label="Genres" optional hint={genres.length >= 3 ? "That's the limit of 3." : "Pick up to 3."}>
                <div className="flex flex-wrap gap-1.5">
                  {GENRES.map((g) => (
                    <button key={g} onClick={() => toggleGenre(g)}
                      className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", genres.includes(g) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                      {g}
                    </button>
                  ))}
                </div>
              </Field>
              <Field label="They are" optional>
                <div className="relative">
                  <select value={artistType} onChange={(e) => setArtistType(e.target.value)} className={selectCls}>
                    <option value="">Not sure</option>
                    {ARTIST_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
                </div>
              </Field>
              <Field label="They play" optional>
                <div className="flex gap-1.5">
                  {ACT_TYPES.map((t) => (
                    <button key={t.label} onClick={() => setActType(actType?.join() === t.value.join() ? undefined : t.value)}
                      className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors", actType?.join() === t.value.join() ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          )}
        </div>
      </div>

      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
      <div className="mt-4 flex gap-2.5">
        <button onClick={check} disabled={checking || !name.trim() || !location}
          className="bndy-btn flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-40">
          {checking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Looks good
        </button>
        <button onClick={onBack} className="bndy-btn2 flex-1 py-3.5 text-[14px]">Back</button>
      </div>
    </div>
  );
}
