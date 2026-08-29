"use client";

// Curator edit sheets + hide flow (backlog feature 4).
// The server whitelist is the contract; these forms only offer fields the
// server accepts. Jason rulings 2026-08-11:
// - Venue address/postcode/city come from the VERIFIED Google Place ID and
//   are never hand-edited. Curators touch socials, website, ticketing only.
// - Artist location works like godmode: town (places look-up, with
//   coordinates) OR region, two explicit modes.
// - Every sheet has a visible close button and a Cancel action.

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronDown, Loader2, MapPin, X } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { curatorApi, useCuratorInvalidate, type CuratorEntity } from "@/lib/curator";
import { REGIONS } from "@/features/wizard/lib";
import { placesSuggest, placesDetails, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { canonicalArtistType, useArtistTaxonomy } from "@/lib/artistTaxonomy";
import { cn } from "@/lib/cn";
import { validateMediaUrl } from "@/features/artists/media";
import type { Artist, Gig, Venue } from "@/domain/types";

const field =
  "w-full rounded-2xl border border-line glass px-4 py-3 text-[14.5px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55";
const label = "mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim";

function useSubmit(type: CuratorEntity, id: string, onDone: () => void) {
  const router = useRouter();
  const invalidate = useCuratorInvalidate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await invalidate(type, id);
      router.refresh(); // Re-run server component to show updated data
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

/** Header for curator sheets. Close button removed  -  Sheet now provides it globally. */
export function SheetHeader({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="min-w-0 pr-10">
      <h2 className="truncate text-[19px] font-black tracking-tight text-txt">{title}</h2>
      {sub && <p className="mt-0.5 text-[12px] font-semibold text-dim">{sub}</p>}
    </div>
  );
}

export function SheetFooter({ busy, disabled, saveLabel, onCancel, onSave, tone = "acc" }: {
  busy: boolean;
  disabled?: boolean;
  saveLabel: string;
  onCancel: () => void;
  onSave: () => void;
  tone?: "acc" | "red" | "amber" | "green";
}) {
  const toneCls =
    tone === "red" ? "bg-red-600 text-white"
    : tone === "amber" ? "bg-amber-600 text-white"
    : tone === "green" ? "bg-emerald-600 text-white"
    : "bg-acc text-on-acc";
  return (
    <div className="mt-5 flex gap-2.5">
      <button type="button" onClick={onCancel} disabled={busy} className="bndy-btn2 flex-1 rounded-2xl py-3 text-[14px] font-extrabold">
        Cancel
      </button>
      <button
        type="button"
        onClick={onSave}
        disabled={busy || disabled}
        className={cn("flex flex-[2] items-center justify-center rounded-2xl py-3 text-[14px] font-extrabold transition-opacity hover:opacity-90 disabled:opacity-50", toneCls)}
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : saveLabel}
      </button>
    </div>
  );
}

function ErrorLine({ error }: { error: string | null }) {
  if (!error) return null;
  return (
    <p className="mt-3 rounded-xl border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] font-semibold text-red-400">
      {error}
    </p>
  );
}

function socialOf(entity: { socials?: { platform: string; url: string }[] }, platform: string): string {
  return entity.socials?.find((s) => s.platform === platform)?.url ?? "";
}

/* ---------- venue ---------- */

export function EditVenueSheet({ venue, open, onClose }: { venue: Venue; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    website: venue.website ?? "",
    facebookUrl: socialOf(venue, "facebook"),
    instagramUrl: socialOf(venue, "instagram"),
    standardTicketed: venue.standardTicketed ?? false,
    standardTicketUrl: venue.standardTicketUrl ?? "",
    standardTicketInformation: venue.standardTicketInformation ?? "",
  });
  // A8 fix: reset form when sheet opens or venue changes to prevent stale data
  useEffect(() => {
    if (open) {
      setF({
        website: venue.website ?? "",
        facebookUrl: socialOf(venue, "facebook"),
        instagramUrl: socialOf(venue, "instagram"),
        standardTicketed: venue.standardTicketed ?? false,
        standardTicketUrl: venue.standardTicketUrl ?? "",
        standardTicketInformation: venue.standardTicketInformation ?? "",
      });
    }
  }, [open, venue]);
  const { busy, error, run } = useSubmit("venue", venue.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title={`Edit ${venue.name}`} sub="Name and address stay locked to the verified Google listing. Wrong address? Flag the venue for staff." />
      <label className={label}>Website</label>
      <input className={field} value={f.website} onChange={(e) => setF({ ...f, website: e.target.value })} placeholder="https://…" inputMode="url" />
      <label className={label}>Facebook</label>
      <input className={field} value={f.facebookUrl} onChange={(e) => setF({ ...f, facebookUrl: e.target.value })} placeholder="https://facebook.com/…" inputMode="url" />
      <label className={label}>Instagram</label>
      <input className={field} value={f.instagramUrl} onChange={(e) => setF({ ...f, instagramUrl: e.target.value })} placeholder="https://instagram.com/…" inputMode="url" />
      <button
        type="button"
        onClick={() => setF({ ...f, standardTicketed: !f.standardTicketed })}
        aria-pressed={f.standardTicketed}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.standardTicketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.standardTicketed && <Check size={12} strokeWidth={3.5} />}
        </span>
        Usually ticketed
      </button>
      {f.standardTicketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.standardTicketUrl} onChange={(e) => setF({ ...f, standardTicketUrl: e.target.value })} placeholder="https://…" inputMode="url" />
          <label className={label}>Ticket info</label>
          <input className={field} value={f.standardTicketInformation} onChange={(e) => setF({ ...f, standardTicketInformation: e.target.value })} placeholder="e.g. £8 adv / £10 door" />
        </>
      )}
      <ErrorLine error={error} />
      <SheetFooter busy={busy} saveLabel="Save venue" onCancel={onClose} onSave={() => run(() => curatorApi.updateVenue(venue.id, f))} />
    </Sheet>
  );
}

/* ---------- artist ---------- */

type LocMode = "town" | "region";
type ArtistEditTab = "profile" | "links";

export function EditArtistSheet({ artist, open, onClose, saveArtist, ownerMode = false }: {
  artist: Artist;
  open: boolean;
  onClose: () => void;
  saveArtist?: (fields: Record<string, unknown>) => Promise<unknown>;
  ownerMode?: boolean;
}) {
  const { data: taxonomy } = useArtistTaxonomy();
  const isRegion = (REGIONS as readonly string[]).includes(artist.location ?? "");
  const [f, setF] = useState({
    bio: artist.bio ?? "",
    genres: artist.genres ?? [],
    artistType: canonicalArtistType(artist.artistType) ?? artist.artistType ?? "",
    actType: artist.actType ?? [] as string[],
    acoustic: artist.acoustic ?? false,
    facebookUrl: socialOf(artist, "facebook"),
    instagramUrl: socialOf(artist, "instagram"),
    websiteUrl: socialOf(artist, "website"),
    youtubeUrl: socialOf(artist, "youtube"),
    spotifyUrl: socialOf(artist, "spotify"),
    soundcloudUrl: socialOf(artist, "soundcloud"),
    bandcampUrl: socialOf(artist, "bandcamp"),
  });
  const [locMode, setLocMode] = useState<LocMode>(isRegion ? "region" : "town");
  const [activeTab, setActiveTab] = useState<ArtistEditTab>("profile");
  const [region, setRegion] = useState(isRegion ? artist.location ?? "" : "");
  const [townQ, setTownQ] = useState(isRegion ? "" : artist.location ?? "");
  const [townPicked, setTownPicked] = useState<string | null>(isRegion ? null : artist.location ?? null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [preds, setPreds] = useState<PlaceSuggestion[]>([]);
  const [genresOpen, setGenresOpen] = useState(false);
  const deb = useRef<number | undefined>(undefined);
  const { busy, error, run } = useSubmit("artist", artist.id, onClose);

  // A8 fix: reset form when sheet opens or artist changes to prevent stale data
  useEffect(() => {
    if (open) {
      const isReg = (REGIONS as readonly string[]).includes(artist.location ?? "");
      setF({
        bio: artist.bio ?? "",
        genres: artist.genres ?? [],
        artistType: canonicalArtistType(artist.artistType) ?? artist.artistType ?? "",
        actType: artist.actType ?? [],
        acoustic: artist.acoustic ?? false,
        facebookUrl: socialOf(artist, "facebook"),
        instagramUrl: socialOf(artist, "instagram"),
        websiteUrl: socialOf(artist, "website"),
        youtubeUrl: socialOf(artist, "youtube"),
        spotifyUrl: socialOf(artist, "spotify"),
        soundcloudUrl: socialOf(artist, "soundcloud"),
        bandcampUrl: socialOf(artist, "bandcamp"),
      });
      setLocMode(isReg ? "region" : "town");
      setRegion(isReg ? artist.location ?? "" : "");
      setTownQ(isReg ? "" : artist.location ?? "");
      setTownPicked(isReg ? null : artist.location ?? null);
      setCoords(null);
      setPreds([]);
      setGenresOpen(false);
      setActiveTab("profile");
    }
  }, [open, artist]);

  // Town look-up via bndy's own Places proxy  -  same source as the wizard.
  useEffect(() => {
    window.clearTimeout(deb.current);
    if (locMode !== "town" || townQ.trim().length < 2 || townPicked === townQ) { setPreds([]); return; }
    deb.current = window.setTimeout(async () => {
      try { setPreds(await placesSuggest(townQ, "town")); } catch { setPreds([]); }
    }, 220);
    return () => window.clearTimeout(deb.current);
  }, [townQ, townPicked, locMode]);

  const tidy = (s: string) => s.replace(/,\s*UK$/i, "").trim();
  const pickTown = async (p: PlaceSuggestion) => {
    const clean = tidy(p.name);
    setTownQ(clean);
    setTownPicked(clean);
    setPreds([]);
    const d = await placesDetails(p.placeId).catch(() => null);
    setCoords(d && typeof d.lat === "number" ? { lat: d.lat, lng: d.lng } : null);
  };

  const location = locMode === "town" ? (townPicked ?? townQ.trim()) : region;
  const toggleGenre = (g: string) =>
    setF((prev) => ({ ...prev, genres: prev.genres.includes(g) ? prev.genres.filter((x) => x !== g) : [...prev.genres, g] }));
  const toggleAct = (v: string) =>
    setF((prev) => ({ ...prev, actType: prev.actType.includes(v) ? prev.actType.filter((x) => x !== v) : [...prev.actType, v] }));
  // Keep retired values visible/removable on existing records without offering
  // them to artists who do not already have them.
  const genreChoices = [...new Set([...f.genres, ...taxonomy.genres])];

  const payload = useMemo(() => ({
    bio: f.bio,
    location,
    locationType: locMode === "town" ? "city" : "region",
    ...(locMode === "town" && coords ? { locationLat: coords.lat, locationLng: coords.lng } : {}),
    ...(locMode === "region" ? { locationLat: null, locationLng: null } : {}),
    genres: f.genres,
    artistType: f.artistType || null,
    actType: f.actType.length ? f.actType : null,
    acoustic: f.acoustic,
    facebookUrl: f.facebookUrl.trim(),
    instagramUrl: f.instagramUrl.trim(),
    websiteUrl: f.websiteUrl.trim(),
    youtubeUrl: f.youtubeUrl.trim(),
    spotifyUrl: f.spotifyUrl.trim(),
    soundcloudUrl: f.soundcloudUrl.trim(),
    bandcampUrl: f.bandcampUrl.trim(),
  }), [f, location, locMode, coords]);

  const mediaErrors = {
    youtubeUrl: validateMediaUrl("youtube", f.youtubeUrl),
    spotifyUrl: validateMediaUrl("spotify", f.spotifyUrl),
    soundcloudUrl: validateMediaUrl("soundcloud", f.soundcloudUrl),
    bandcampUrl: validateMediaUrl("bandcamp", f.bandcampUrl),
  };
  const hasMediaError = Object.values(mediaErrors).some(Boolean);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader
        title={`Edit ${artist.name}`}
        sub={ownerMode ? "Keep your public profile useful, current and unmistakably yours." : "Name changes stay with bndy staff."}
      />

      <div className="sticky top-0 z-10 -mx-1 mt-4 rounded-2xl border border-line bg-card p-1 shadow-sm" role="tablist" aria-label="Artist edit sections">
        <div className="grid grid-cols-2 gap-1">
          <button type="button" role="tab" aria-selected={activeTab === "profile"} onClick={() => setActiveTab("profile")} className={cn("min-h-10 rounded-xl px-3 text-[11.5px] font-black transition-colors", activeTab === "profile" ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>Profile</button>
          <button type="button" role="tab" aria-selected={activeTab === "links"} onClick={() => setActiveTab("links")} className={cn("min-h-10 rounded-xl px-3 text-[11.5px] font-black transition-colors", activeTab === "links" ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>Links &amp; media</button>
        </div>
      </div>

      {activeTab === "profile" ? (
        <div role="tabpanel" aria-label="Profile">
          <label className={label}>Based in</label>
      <div className="flex gap-2">
        {locMode === "town" ? (
          <div className="relative flex-1">
            <MapPin size={15} className="absolute left-3.5 top-[15px] text-dim" />
            <input
              value={townQ}
              onChange={(e) => { setTownQ(e.target.value); setTownPicked(null); setCoords(null); }}
              placeholder="Their home town…"
              className={cn(field, "pl-9", townPicked && "pr-9")}
            />
            {townPicked && <Check size={15} className="absolute right-3.5 top-[15px] text-[var(--acc)]" />}
            {preds.length > 0 && (
              <div className="absolute inset-x-0 top-[calc(100%+4px)] z-20 overflow-hidden rounded-xl border border-line-hi glass-hi shadow-lg">
                {preds.slice(0, 5).map((p) => (
                  <button key={p.placeId} type="button" onClick={() => pickTown(p)}
                    className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-[13.5px] font-semibold transition-colors hover:bg-white/5">
                    <MapPin size={13} className="shrink-0 text-dim" />
                    <span className="min-w-0 truncate">{tidy(p.name)}<span className="text-dim"> · {tidy(p.address) || "UK"}</span></span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="relative flex-1">
            <select value={region} onChange={(e) => setRegion(e.target.value)} className={cn(field, "appearance-none")}>
              <option value="">Choose a region…</option>
              {REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
            <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
          </div>
        )}
        <div className="flex shrink-0 gap-1 self-start rounded-2xl border border-line p-1">
          {(["town", "region"] as const).map((m) => (
            <button key={m} type="button" onClick={() => setLocMode(m)}
              className={cn("rounded-xl px-2.5 py-2 text-[11px] font-extrabold uppercase tracking-wide transition-colors", locMode === m ? "bg-acc text-on-acc" : "text-dim hover:text-txt")}>
              {m === "town" ? "Town" : "Region"}
            </button>
          ))}
        </div>
      </div>

      <label className={label}>Artist type</label>
      <div className="relative">
        <select value={f.artistType} onChange={(e) => setF({ ...f, artistType: e.target.value })} className={cn(field, "appearance-none")}>
          <option value="">Not set</option>
          {taxonomy.artistTypes.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <ChevronDown size={15} className="pointer-events-none absolute right-3.5 top-[16px] text-dim" />
      </div>

      <label className={label}>Plays</label>
      <div className="flex flex-wrap gap-1.5">
        {taxonomy.actTypes.map((t) => (
          <button key={t.value} type="button" onClick={() => toggleAct(t.value)}
            className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", f.actType.includes(t.value) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
            {t.label}
          </button>
        ))}
      </div>

      <label className={label}>Can perform</label>
      <button
        type="button"
        onClick={() => setF((prev) => ({ ...prev, acoustic: !prev.acoustic }))}
        aria-pressed={f.acoustic}
        className="flex items-center gap-2.5 rounded-full border border-line px-3 py-1.5 text-[12.5px] font-bold text-dim transition-colors hover:text-txt"
        style={f.acoustic ? { background: "var(--acc)", color: "var(--on-acc)", borderColor: "transparent" } : undefined}
      >
        <span className={cn("flex h-4 w-4 items-center justify-center rounded border", f.acoustic ? "border-transparent bg-white/15" : "border-line-hi")}>
          {f.acoustic && <Check size={10} strokeWidth={3.5} />}
        </span>
        Acoustic
      </button>

      <div className="mt-4 overflow-hidden rounded-2xl border border-line">
        <button type="button" onClick={() => setGenresOpen((v) => !v)} aria-expanded={genresOpen}
          className="flex w-full items-center justify-between px-4 py-3 text-left">
          <span className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">
            Genres
            {f.genres.length > 0 && <span className="ml-2 normal-case tracking-normal text-txt">{f.genres.slice(0, 3).join(", ")}{f.genres.length > 3 ? ` +${f.genres.length - 3}` : ""}</span>}
          </span>
          <ChevronDown size={15} className={cn("text-dim transition-transform", genresOpen && "rotate-180")} />
        </button>
        {genresOpen && (
          <div className="border-t border-line px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {genreChoices.map((g) => (
                <button key={g} type="button" onClick={() => toggleGenre(g)}
                  className={cn("rounded-full border px-2.5 py-1 text-[12px] font-bold transition-colors", f.genres.includes(g) ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt")}>
                  {g}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

          <label className={label}>Bio</label>
          <textarea className={field} rows={4} value={f.bio} onChange={(e) => setF({ ...f, bio: e.target.value })} />
        </div>
      ) : (
        <div role="tabpanel" aria-label="Links and media">
          <p className="mt-4 text-[11.5px] font-semibold leading-relaxed text-dim">Add only the links this artist actively uses. Empty services stay hidden on the public profile.</p>
      <label className={label}>Facebook</label>
      <input className={field} value={f.facebookUrl} onChange={(e) => setF({ ...f, facebookUrl: e.target.value })} placeholder="https://facebook.com/…" inputMode="url" />
      <label className={label}>Instagram</label>
      <input className={field} value={f.instagramUrl} onChange={(e) => setF({ ...f, instagramUrl: e.target.value })} placeholder="https://instagram.com/…" inputMode="url" />
      <label className={label}>Website</label>
      <input className={field} value={f.websiteUrl} onChange={(e) => setF({ ...f, websiteUrl: e.target.value })} placeholder="https://…" inputMode="url" />

      <div className="mt-6 rounded-[22px] border border-line bg-white/[0.025] p-4">
        <div className="font-meta text-[9px] font-black uppercase tracking-[1.5px] text-[var(--acc-text)]">Listen and watch</div>
        <p className="mt-1 text-[11.5px] font-semibold leading-relaxed text-dim">External media only. Visitors choose when a player loads, and nothing autoplays.</p>

        <label className={label}>Featured YouTube video</label>
        <input className={field} value={f.youtubeUrl} onChange={(e) => setF({ ...f, youtubeUrl: e.target.value })} placeholder="https://youtube.com/watch?v=…" inputMode="url" aria-invalid={Boolean(mediaErrors.youtubeUrl)} />
        {mediaErrors.youtubeUrl && <p className="mt-1.5 text-[11px] font-bold text-red-400">{mediaErrors.youtubeUrl}</p>}
        {!mediaErrors.youtubeUrl && f.youtubeUrl && !f.youtubeUrl.includes("watch?") && !f.youtubeUrl.includes("youtu.be/") && !f.youtubeUrl.includes("/shorts/") && !f.youtubeUrl.includes("/live/") && <p className="mt-1.5 text-[10.5px] font-semibold text-dim">Video and Shorts links play on the page. Channel links stay as a clean outbound button.</p>}

        <label className={label}>Spotify</label>
        <input className={field} value={f.spotifyUrl} onChange={(e) => setF({ ...f, spotifyUrl: e.target.value })} placeholder="https://open.spotify.com/artist/…" inputMode="url" aria-invalid={Boolean(mediaErrors.spotifyUrl)} />
        {mediaErrors.spotifyUrl && <p className="mt-1.5 text-[11px] font-bold text-red-400">{mediaErrors.spotifyUrl}</p>}

        <label className={label}>SoundCloud</label>
        <input className={field} value={f.soundcloudUrl} onChange={(e) => setF({ ...f, soundcloudUrl: e.target.value })} placeholder="https://soundcloud.com/artist/track" inputMode="url" aria-invalid={Boolean(mediaErrors.soundcloudUrl)} />
        {mediaErrors.soundcloudUrl && <p className="mt-1.5 text-[11px] font-bold text-red-400">{mediaErrors.soundcloudUrl}</p>}

        <label className={label}>Bandcamp</label>
        <input className={field} value={f.bandcampUrl} onChange={(e) => setF({ ...f, bandcampUrl: e.target.value })} placeholder="https://artist.bandcamp.com/…" inputMode="url" aria-invalid={Boolean(mediaErrors.bandcampUrl)} />
        {mediaErrors.bandcampUrl && <p className="mt-1.5 text-[11px] font-bold text-red-400">{mediaErrors.bandcampUrl}</p>}
      </div>
        </div>
      )}

      <ErrorLine error={error} />
      <SheetFooter
        busy={busy}
        disabled={(!ownerMode && !location) || hasMediaError}
        saveLabel="Save artist"
        onCancel={onClose}
        onSave={() => run(() => saveArtist ? saveArtist(payload) : curatorApi.updateArtist(artist.id, payload))}
      />
    </Sheet>
  );
}

/* ---------- gig ---------- */

export function EditGigSheet({ gig, open, onClose }: { gig: Gig; open: boolean; onClose: () => void }) {
  const [f, setF] = useState({
    title: gig.title ?? "",
    date: gig.date,
    startTime: gig.startTime ?? "",
    endTime: gig.endTime ?? "",
    ticketed: gig.ticketed ?? false,
    ticketUrl: gig.ticketUrl ?? "",
    isOpenMic: gig.isOpenMic ?? false,
  });
  // A8 fix: reset form when sheet opens or gig changes to prevent stale data
  useEffect(() => {
    if (open) {
      setF({
        title: gig.title ?? "",
        date: gig.date,
        startTime: gig.startTime ?? "",
        endTime: gig.endTime ?? "",
        ticketed: gig.ticketed ?? false,
        ticketUrl: gig.ticketUrl ?? "",
        isOpenMic: gig.isOpenMic ?? false,
      });
    }
  }, [open, gig]);
  const { busy, error, run } = useSubmit("event", gig.id, onClose);

  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader title="Edit gig" />
      <label className={label}>Title</label>
      <input className={field} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} />
      <label className={label}>Date</label>
      <input type="date" className={field} value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} />
      <div className="flex gap-3">
        <div className="flex-1">
          <label className={label}>Start</label>
          <input type="time" className={field} value={f.startTime} onChange={(e) => setF({ ...f, startTime: e.target.value })} />
        </div>
        <div className="flex-1">
          <label className={label}>End</label>
          <input type="time" className={field} value={f.endTime} onChange={(e) => setF({ ...f, endTime: e.target.value })} />
        </div>
      </div>
      <button
        type="button"
        onClick={() => setF({ ...f, ticketed: !f.ticketed })}
        aria-pressed={f.ticketed}
        className="mt-4 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.ticketed ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.ticketed && <Check size={12} strokeWidth={3.5} />}
        </span>
        Ticketed
      </button>
      {f.ticketed && (
        <>
          <label className={label}>Ticket URL</label>
          <input className={field} value={f.ticketUrl} onChange={(e) => setF({ ...f, ticketUrl: e.target.value })} placeholder="https://…" inputMode="url" />
        </>
      )}
      <button
        type="button"
        onClick={() => setF({ ...f, isOpenMic: !f.isOpenMic })}
        aria-pressed={f.isOpenMic}
        className="mt-2.5 flex w-full items-center gap-2.5 rounded-2xl border border-line glass px-4 py-3 text-left text-[14px] font-extrabold"
      >
        <span className={cn("flex h-[18px] w-[18px] items-center justify-center rounded-md border", f.isOpenMic ? "border-transparent bg-acc2 text-on-acc2" : "border-line-hi")}>
          {f.isOpenMic && <Check size={12} strokeWidth={3.5} />}
        </span>
        Open mic
      </button>
      <ErrorLine error={error} />
      <SheetFooter busy={busy} saveLabel="Save gig" onCancel={onClose} onSave={() => run(() => curatorApi.updateEvent(gig.id, f))} />
    </Sheet>
  );
}

/* ---------- hide ---------- */

export function HideSheet({
  type,
  id,
  name,
  open,
  onClose,
}: {
  type: CuratorEntity;
  id: string;
  name: string;
  open: boolean;
  onClose: () => void;
}) {
  const [reason, setReason] = useState("");
  const { busy, error, run } = useSubmit(type, id, onClose);

  const isGig = type === "event";
  return (
    <Sheet open={open} onClose={onClose}>
      <SheetHeader
        title={isGig ? "Delete this gig?" : `Hide ${name}?`}
        sub={isGig
          ? "This removes the gig completely  -  it won't appear anywhere. Use Cancel instead if punters need to know it was called off."
          : "This removes it from every public page. Nothing is destroyed. bndy staff can restore it from godmode."
        }
      />
      <label className={label}>Reason</label>
      <input
        className={field}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder={isGig ? "Listed by mistake, duplicate entry…" : "Duplicate, closed down, wrong listing…"}
      />
      <ErrorLine error={error} />
      <SheetFooter
        busy={busy}
        disabled={!reason.trim()}
        saveLabel={isGig ? "Delete it" : "Hide it"}
        tone="red"
        onCancel={onClose}
        onSave={() => run(() => curatorApi.hide(type, id, reason.trim()))}
      />
    </Sheet>
  );
}
