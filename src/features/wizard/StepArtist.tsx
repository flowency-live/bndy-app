"use client";

import { useMemo, useState } from "react";
import { Check, Loader2, Music, Plus, Search } from "lucide-react";
import { useArtists, useUpcomingGigs } from "@/lib/hooks";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/cn";
import { ACT_TYPES, GENRES, rankArtists, type NewArtistDraft } from "./lib";
import { resolveArtist, type ArtistCandidate } from "./wizardApi";

/** WHO step. Candidates ALWAYS show location — the Ant Hill Mob defence: same-named
 *  acts are distinguishable by place, and same-region duplicates are impossible
 *  (not offered here, rejected server-side regardless). */
export function StepArtist({ onPickExisting, onPickNew }: {
  onPickExisting: (a: { id: string; name: string }) => void;
  onPickNew: (draft: NewArtistDraft) => void;
}) {
  const { data: artists = [] } = useArtists();
  const { data: gigs = [] } = useUpcomingGigs();
  const gigCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const g of gigs) if (g.artistId) m.set(g.artistId, (m.get(g.artistId) ?? 0) + 1);
    return m;
  }, [gigs]);

  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const ranked = useMemo(() => rankArtists(q, artists), [q, artists]);

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
          <Plus size={15} /> {ranked.length ? `None of these — add “${q.trim()}”` : `Add “${q.trim()}” to bndy`}
        </button>
      )}
    </div>
  );
}

function NewArtistForm({ initialName, onBack, onPickExisting, onDone }: {
  initialName: string;
  onBack: () => void;
  onPickExisting: (a: { id: string; name: string }) => void;
  onDone: (draft: NewArtistDraft) => void;
}) {
  const [name, setName] = useState(initialName);
  const [location, setLocation] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [genres, setGenres] = useState<string[]>([]);
  const [actType, setActType] = useState<string[] | undefined>(undefined);
  const [checking, setChecking] = useState(false);
  const [candidates, setCandidates] = useState<ArtistCandidate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleGenre = (g: string) => setGenres((prev) => prev.includes(g) ? prev.filter((x) => x !== g) : prev.length < 3 ? [...prev, g] : prev);

  const draft = (confirmNew: boolean): NewArtistDraft => ({
    name: name.trim(),
    location: location.trim(),
    facebookUrl: facebookUrl.trim() || undefined,
    genres,
    actType,
    confirmNew: confirmNew || undefined,
  });

  const check = async () => {
    if (!name.trim() || !location.trim()) { setError("Name and home town are both needed."); return; }
    setChecking(true);
    setError(null);
    const r = await resolveArtist({ name: name.trim(), location: location.trim(), facebookUrl: facebookUrl.trim() || undefined }, { dryRun: true });
    setChecking(false);
    if (r.action === "matched" && r.artistId) {
      onPickExisting({ id: r.artistId, name: r.artistName ?? name.trim() });
    } else if (r.action === "review" && r.candidates.length) {
      setCandidates(r.candidates);
    } else if (r.action === "error" && r.code === "DATA_QUALITY") {
      setError(r.message ?? "That doesn't look like a single artist name — use the act's own name, no line-ups or 'TBC'.");
    } else if (r.action === "error" && r.code === "LOCATION_UNRESOLVABLE") {
      setError("We couldn't place that location — use a UK town or city, e.g. 'Stoke-on-Trent'.");
    } else {
      onDone(draft(false)); // clear to create at publish time
    }
  };

  if (candidates) {
    return (
      <div>
        <h2 className="text-[19px] font-black tracking-tight">Did you mean…?</h2>
        <p className="mt-1.5 text-[13px] font-semibold text-dim">These acts are already on bndy — check the location.</p>
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
          No — mine is a different act (based in {location.trim() || "another town"})
        </button>
        <p className="mt-2 text-[11.5px] font-semibold text-dim2">Same name AND same area = same act on bndy, so this only works if yours is somewhere else.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-[19px] font-black tracking-tight">Add a new artist</h2>
      <div className="mt-3 space-y-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none focus:border-orange/55" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Home town</span>
          <input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Stoke-on-Trent"
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
          <span className="mt-1 block text-[11.5px] font-semibold text-dim2">This is how we tell same-named acts apart — it matters.</span>
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Facebook page <span className="text-dim2">(optional, helps massively)</span></span>
          <input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="facebook.com/…" inputMode="url"
            className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-semibold outline-none placeholder:text-dim focus:border-orange/55" />
        </label>
        <div>
          <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Genres <span className="text-dim2">(up to 3)</span></span>
          <div className="flex flex-wrap gap-1.5">
            {GENRES.map((g) => (
              <button key={g} onClick={() => toggleGenre(g)}
                className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", genres.includes(g) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                {g}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="mb-1.5 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">They play <span className="text-dim2">(skip if unsure)</span></span>
          <div className="flex gap-1.5">
            {ACT_TYPES.map((t) => (
              <button key={t.label} onClick={() => setActType(actType?.join() === t.value.join() ? undefined : t.value)}
                className={cn("rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors", actType?.join() === t.value.join() ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
      <div className="mt-4 flex gap-2.5">
        <button onClick={check} disabled={checking || !name.trim() || !location.trim()}
          className="bndy-btn flex flex-1 items-center justify-center gap-2 py-3.5 text-[14px] disabled:opacity-40">
          {checking ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />} Looks good
        </button>
        <button onClick={onBack} className="bndy-btn2 flex-1 py-3.5 text-[14px]">Back</button>
      </div>
    </div>
  );
}
