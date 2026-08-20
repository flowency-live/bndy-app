"use client";

// Festival curator workbench (FESTIVAL-CURATOR-PLAN.md).
// Loads through the curator read so DRAFTS are visible here and nowhere else.
// Three sections: Details, Venues, Gigs. Gigs come in two moves: the existing
// add-a-gig wizard (prefilled so the gig is born linked) and tagging gigs that
// already exist at the festival's venues inside its date window.

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  ArrowUpRight, CalendarRange, Check, Eye, EyeOff, Loader2, Lock, MapPin,
  Music2, Plus, ShieldAlert, Trash2,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { curatorApi, useCuratorInvalidate, type CuratorFestivalRecord } from "@/lib/curator";
import { findOrCreateVenue, placesDetails, placesSuggest, type PlaceSuggestion } from "@/features/wizard/wizardApi";
import { fetchVenueGigs } from "@/lib/api";
import { useVenues } from "@/lib/hooks";
import { formatTime, prettyDate } from "@/domain/dates";
import type { Gig } from "@/domain/types";
import { festivalDateRange } from "../festivalUtils";

const field =
  "w-full rounded-2xl border border-line glass px-4 py-3 text-[14.5px] font-semibold text-txt outline-none placeholder:text-dim2 focus:border-orange/55";
const label = "mb-1.5 mt-4 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim";
const sectionCls = "mt-6 rounded-[var(--rad-lg)] border border-line bg-card p-4 shadow-[var(--shadow)] sm:p-5";

function venueIdsOf(f: CuratorFestivalRecord): string[] {
  return [...new Set([f.primaryVenueId, ...(f.venueIds || [])].filter((v): v is string => !!v))];
}

export function FestivalManage({ idOrSlug }: { idOrSlug: string }) {
  const { isCurator } = useAuth();
  const invalidate = useCuratorInvalidate();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["curator-festival", idOrSlug],
    queryFn: () => curatorApi.getFestival(idOrSlug),
    enabled: isCurator,
    staleTime: 30 * 1000,
    retry: false,
  });
  const festival = data?.festival;

  if (!isCurator) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <ShieldAlert size={28} className="mx-auto text-[var(--acc)]" />
        <h1 className="mt-3 text-xl font-black">Curator access needed.</h1>
        <p className="mt-2 text-[13px] font-semibold text-dim">Only bndy curators can manage festivals.</p>
      </div>
    );
  }
  if (isLoading) {
    return <div className="flex min-h-[40dvh] items-center justify-center"><Loader2 size={28} className="animate-spin text-dim" /></div>;
  }
  if (error || !festival) {
    return (
      <div className="mx-auto max-w-md px-4 py-10 text-center">
        <h1 className="text-xl font-black">Festival not found.</h1>
        <Link href="/festivals/new" className="bndy-btn2 mt-4 inline-flex px-4 py-2.5 text-[12.5px] font-black">Create a festival</Link>
      </div>
    );
  }

  const done = async () => {
    await invalidate("festival", festival.id);
    await refetch();
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pb-28 pt-4">
      <Header festival={festival} onDone={done} />
      <DetailsSection festival={festival} onDone={done} />
      <VenuesSection festival={festival} onDone={done} />
      <GigsSection festival={festival} />
    </div>
  );
}

/* ---------------- header: state + publish ---------------- */

function Header({ festival, onDone }: { festival: CuratorFestivalRecord; onDone: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const live = festival.isPublic === true;
  const hasVenue = venueIdsOf(festival).length > 0;

  const setPublic = async (isPublic: boolean) => {
    setBusy(true);
    setError(null);
    try {
      await curatorApi.updateFestival(festival.id, { isPublic });
      await onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <header className="rounded-[var(--rad-lg)] border border-line bg-card p-4 shadow-[var(--shadow)] sm:p-5">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-meta text-[8.5px] font-black uppercase tracking-[1.2px] ${live ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
            {live ? <Eye size={10} /> : <EyeOff size={10} />} {live ? "Live" : "Draft"}
          </span>
          <h1 className="mt-2 text-[22px] font-black leading-tight tracking-tight">{festival.name}</h1>
          <div className="mt-1.5 flex items-center gap-1.5 text-[12px] font-bold text-dim">
            <CalendarRange size={13} /> {festivalDateRange(festival.startDate, festival.endDate || festival.startDate)}
            {festival.town && <><MapPin size={13} className="ml-1.5" /> {festival.town}</>}
          </div>
        </div>
        {live && (
          <Link href={`/festivals/${festival.slug}`} className="flex shrink-0 items-center gap-1 rounded-xl border border-line bg-card2 px-2.5 py-2 text-[11px] font-black text-dim hover:text-txt">
            View <ArrowUpRight size={13} />
          </Link>
        )}
      </div>

      <button
        type="button"
        onClick={() => setPublic(!live)}
        disabled={busy || (!live && !hasVenue)}
        className={`mt-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-[14px] font-black transition-transform active:scale-[.99] disabled:opacity-50 ${live ? "border border-line bg-card2 text-txt" : "bg-[var(--acc)] text-on-acc"}`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : live ? <EyeOff size={16} /> : <Check size={16} />}
        {live ? "Take it off the public site" : "Publish festival"}
      </button>
      {!live && !hasVenue && <p className="mt-2 text-center text-[11.5px] font-semibold text-dim2">Add at least one venue before publishing.</p>}
      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
    </header>
  );
}

/* ---------------- details ---------------- */

function DetailsSection({ festival, onDone }: { festival: CuratorFestivalRecord; onDone: () => Promise<void> }) {
  const [name, setName] = useState(festival.name);
  const [startDate, setStartDate] = useState(festival.startDate);
  const [endDate, setEndDate] = useState(festival.endDate || festival.startDate);
  const [town, setTown] = useState(festival.town || festival.location || "");
  const [free, setFree] = useState(festival.ticketed !== true);
  const [price, setPrice] = useState(festival.ticketed === true ? festival.price || "" : "");
  const [ticketUrl, setTicketUrl] = useState(festival.ticketUrl || "");
  const [websiteUrl, setWebsiteUrl] = useState(festival.websiteUrl || "");
  const [posterImageUrl, setPosterImageUrl] = useState(festival.posterImageUrl || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    setBusy(true);
    setError(null);
    setSaved(false);
    try {
      await curatorApi.updateFestival(festival.id, {
        name: name.trim(),
        startDate,
        endDate: endDate || startDate,
        town: town.trim(),
        location: town.trim(),
        ticketed: !free,
        price: free ? "FREE" : price.trim(),
        ticketUrl: ticketUrl.trim(),
        websiteUrl: websiteUrl.trim(),
        posterImageUrl: posterImageUrl.trim(),
      });
      await onDone();
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className={sectionCls}>
      <h2 className="text-[15px] font-black uppercase tracking-[1px]">Details</h2>

      <label className={label} htmlFor="mf-name">Festival name</label>
      <input id="mf-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={label} htmlFor="mf-start">First day</label>
          <input id="mf-start" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={field} />
        </div>
        <div>
          <label className={label} htmlFor="mf-end">Last day</label>
          <input id="mf-end" type="date" min={startDate} value={endDate} onChange={(e) => setEndDate(e.target.value)} className={field} />
        </div>
      </div>

      <label className={label} htmlFor="mf-town">Town</label>
      <input id="mf-town" value={town} onChange={(e) => setTown(e.target.value)} className={field} />

      <label className={label}>Entry</label>
      <div className="flex overflow-hidden rounded-2xl border border-line">
        <button type="button" onClick={() => setFree(true)} className={`flex-1 py-3 text-[13px] font-black transition-colors ${free ? "bg-[var(--acc)] text-on-acc" : "bg-card text-dim"}`}>Free to attend</button>
        <button type="button" onClick={() => setFree(false)} className={`flex-1 py-3 text-[13px] font-black transition-colors ${!free ? "bg-[var(--acc)] text-on-acc" : "bg-card text-dim"}`}>Ticketed</button>
      </div>
      {!free && (
        <>
          <label className={label} htmlFor="mf-price">Price</label>
          <input id="mf-price" value={price} onChange={(e) => setPrice(e.target.value)} className={field} />
          <label className={label} htmlFor="mf-tickets">Ticket link</label>
          <input id="mf-tickets" type="url" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} className={field} />
        </>
      )}

      <label className={label} htmlFor="mf-web">Festival website</label>
      <input id="mf-web" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} className={field} />

      <label className={label} htmlFor="mf-poster">Poster image link <span className="text-dim2">(the organiser&apos;s own poster)</span></label>
      <input id="mf-poster" type="url" value={posterImageUrl} onChange={(e) => setPosterImageUrl(e.target.value)} placeholder="https://" className={field} />
      <p className="mt-1.5 text-[11px] font-semibold text-dim2">No poster? bndy generates festival artwork automatically.</p>

      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
      <button type="button" onClick={save} disabled={busy || name.trim().length < 3 || !startDate} className="bndy-btn2 mt-4 flex w-full items-center justify-center gap-2 py-3 text-[13.5px] font-black disabled:opacity-50">
        {busy ? <Loader2 size={15} className="animate-spin" /> : saved ? <Check size={15} /> : null}
        {saved && !busy ? "Saved" : "Save details"}
      </button>
    </section>
  );
}

/* ---------------- venues ---------------- */

function VenuesSection({ festival, onDone }: { festival: CuratorFestivalRecord; onDone: () => Promise<void> }) {
  const { data: venues = [] } = useVenues();
  const ids = venueIdsOf(festival);
  const venueById = useMemo(() => new Map(venues.map((v) => [v.id, v])), [venues]);

  const [q, setQ] = useState("");
  const [places, setPlaces] = useState<PlaceSuggestion[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const bndyMatches = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (needle.length < 2) return [];
    return venues.filter((v) => !ids.includes(v.id) && v.name.toLowerCase().includes(needle)).slice(0, 5);
  }, [q, venues, ids]);

  const searchPlaces = async () => {
    setError(null);
    try {
      setPlaces(await placesSuggest(q, "venue"));
    } catch {
      setPlaces([]);
    }
  };

  const saveVenues = async (nextIds: string[], primary?: string) => {
    // Removing the last venue must also CLEAR primary - a stale primaryVenueId
    // would keep the ghost venue in every venue union.
    const nextPrimary =
      nextIds.length === 0
        ? null
        : primary ?? (nextIds.includes(festival.primaryVenueId || "") ? festival.primaryVenueId : nextIds[0]);
    await curatorApi.updateFestival(festival.id, { venueIds: nextIds, primaryVenueId: nextPrimary });
    await onDone();
  };

  const attach = async (venueId: string) => {
    setBusyId(venueId);
    setError(null);
    try {
      await saveVenues([...ids, venueId]);
      setQ("");
      setPlaces([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the venue.");
    } finally {
      setBusyId(null);
    }
  };

  const attachFromPlace = async (p: PlaceSuggestion) => {
    setBusyId(p.placeId);
    setError(null);
    try {
      const det = await placesDetails(p.placeId);
      const res = await findOrCreateVenue({
        name: det?.name || p.name,
        address: det?.address || p.address,
        city: det?.city,
        googlePlaceId: p.placeId,
        latitude: det?.lat,
        longitude: det?.lng,
      });
      if (!res.ok || !res.venueId) throw new Error(res.error || "Venue could not be verified.");
      if (!ids.includes(res.venueId)) await saveVenues([...ids, res.venueId]);
      setQ("");
      setPlaces([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not add the venue.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (venueId: string) => {
    setBusyId(venueId);
    setError(null);
    try {
      const next = ids.filter((v) => v !== venueId);
      await saveVenues(next, festival.primaryVenueId === venueId ? next[0] : undefined);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not remove the venue.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className={sectionCls}>
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-black uppercase tracking-[1px]">Venues</h2>
        <span className="tnum rounded-full border border-line bg-card2 px-2 py-0.5 text-[10px] font-black text-dim">{ids.length}</span>
      </div>

      {ids.length === 0 && <p className="mt-3 text-[13px] font-semibold text-dim">No venues yet. The festival needs at least one to publish.</p>}
      <div className="mt-3 space-y-1.5">
        {ids.map((id) => {
          const v = venueById.get(id);
          return (
            <div key={id} className="flex items-center gap-2.5 rounded-xl border border-line bg-card2 px-3 py-2.5">
              <MapPin size={14} className="shrink-0 text-[var(--acc)]" />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">{v?.name || id}</span>
              {festival.primaryVenueId === id && <span className="rounded-md bg-card px-1.5 py-0.5 font-meta text-[8px] font-black uppercase tracking-[.8px] text-dim">Primary</span>}
              <button type="button" onClick={() => remove(id)} disabled={busyId === id} aria-label={`Remove ${v?.name || "venue"}`} className="text-dim transition-colors hover:text-red-400 disabled:opacity-50">
                {busyId === id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          );
        })}
      </div>

      <label className={label} htmlFor="mf-venue-q">Add a venue</label>
      <div className="flex gap-2">
        <input id="mf-venue-q" value={q} onChange={(e) => { setQ(e.target.value); setPlaces([]); }} placeholder="Search bndy venues or Google" className={field} />
        <button type="button" onClick={searchPlaces} disabled={q.trim().length < 3} className="bndy-btn2 shrink-0 px-3.5 text-[12px] font-black disabled:opacity-50">Google</button>
      </div>
      {(bndyMatches.length > 0 || places.length > 0) && (
        <div className="mt-2 space-y-1.5">
          {bndyMatches.map((v) => (
            <button key={v.id} type="button" onClick={() => attach(v.id)} disabled={busyId === v.id} className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card2 disabled:opacity-50">
              <Plus size={14} className="shrink-0 text-[var(--acc)]" />
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">{v.name}</span>
              <span className="shrink-0 text-[11px] font-bold text-dim">{v.city}</span>
            </button>
          ))}
          {places.filter((p) => !bndyMatches.some((v) => v.name.toLowerCase() === p.name.toLowerCase())).slice(0, 4).map((p) => (
            <button key={p.placeId} type="button" onClick={() => attachFromPlace(p)} disabled={busyId === p.placeId} className="flex w-full items-center gap-2.5 rounded-xl border border-dashed border-line bg-card px-3 py-2.5 text-left transition-colors hover:bg-card2 disabled:opacity-50">
              {busyId === p.placeId ? <Loader2 size={14} className="shrink-0 animate-spin" /> : <Plus size={14} className="shrink-0 text-dim" />}
              <span className="min-w-0 flex-1 truncate text-[13.5px] font-extrabold">{p.name}</span>
              <span className="shrink-0 truncate text-[11px] font-bold text-dim">{p.address}</span>
            </button>
          ))}
        </div>
      )}
      {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
    </section>
  );
}

/* ---------------- gigs: add + tag ---------------- */

function GigsSection({ festival }: { festival: CuratorFestivalRecord }) {
  const invalidate = useCuratorInvalidate();
  const ids = venueIdsOf(festival);
  const start = festival.startDate;
  const end = festival.endDate || festival.startDate;

  const queries = useQueries({
    queries: ids.map((venueId) => ({
      queryKey: ["festival-tag-gigs", venueId, start],
      queryFn: () => fetchVenueGigs(venueId, start),
      enabled: !!venueId,
      staleTime: 60 * 1000,
    })),
  });
  const loading = queries.some((q) => q.isLoading);
  const gigs: Gig[] = useMemo(
    () => queries.flatMap((q) => q.data || []).filter((g) => g.date >= start && g.date <= end),
    [queries, start, end],
  );

  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const stateOf = (g: Gig): "ours" | "free" | "locked" =>
    g.festivalId === festival.id ? "ours" : g.festivalId ? "locked" : "free";
  const isTicked = (g: Gig) => picked[g.id] ?? stateOf(g) === "ours";
  const dirty = gigs.some((g) => stateOf(g) !== "locked" && (picked[g.id] ?? stateOf(g) === "ours") !== (stateOf(g) === "ours"));

  const save = async () => {
    const add = gigs.filter((g) => stateOf(g) === "free" && picked[g.id] === true).map((g) => g.id);
    const remove = gigs.filter((g) => stateOf(g) === "ours" && picked[g.id] === false).map((g) => g.id);
    if (add.length === 0 && remove.length === 0) return;
    setBusy(true);
    setNote(null);
    try {
      const res = await curatorApi.tagFestivalEvents({ festivalId: festival.id, festivalName: festival.name, add, remove });
      await invalidate("festival", festival.id);
      queries.forEach((q) => q.refetch());
      setPicked({});
      setNote(
        `${res.tagged.length} added, ${res.untagged.length} removed${res.skipped.length ? `, ${res.skipped.length} skipped` : ""}.`,
      );
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Save failed. Try again.");
    } finally {
      setBusy(false);
    }
  };

  const byVenue = useMemo(() => {
    const m = new Map<string, Gig[]>();
    for (const g of gigs) {
      const arr = m.get(g.venueName) || [];
      arr.push(g);
      m.set(g.venueName, arr);
    }
    return [...m.entries()];
  }, [gigs]);

  return (
    <section className={sectionCls}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[15px] font-black uppercase tracking-[1px]">Gigs</h2>
        <Link
          href={`/add?festivalId=${festival.id}&festivalName=${encodeURIComponent(festival.name)}&festivalSlug=${festival.slug}`}
          className="bndy-btn flex items-center gap-1.5 px-3 py-2 text-[12px] font-black"
        >
          <Plus size={14} /> Add a gig
        </Link>
      </div>
      <p className="mt-2 text-[12px] font-semibold text-dim">
        New gigs publish straight into this festival. Below are the gigs already listed at the festival&apos;s venues between {start} and {end}: tick to include them.
      </p>

      {ids.length === 0 && <p className="mt-3 text-[13px] font-semibold text-dim">Add a venue first, then its gigs appear here.</p>}
      {loading && <div className="mt-4 flex justify-center"><Loader2 size={20} className="animate-spin text-dim" /></div>}
      {!loading && ids.length > 0 && gigs.length === 0 && (
        <p className="mt-3 rounded-xl border border-line bg-card2 px-3.5 py-3 text-[12.5px] font-semibold text-dim">
          <Music2 size={13} className="mr-1.5 inline text-[var(--acc)]" />
          No existing gigs at these venues in the festival window yet.
        </p>
      )}

      <div className="mt-3 space-y-4">
        {byVenue.map(([venueName, venueGigs]) => (
          <div key={venueName}>
            <div className="mb-1.5 flex items-center gap-1.5 font-meta text-[9px] font-black uppercase tracking-[1.2px] text-dim">
              <MapPin size={11} className="text-[var(--acc)]" /> {venueName}
            </div>
            <div className="overflow-hidden rounded-xl border border-line">
              {venueGigs.map((g, i) => {
                const state = stateOf(g);
                const ticked = isTicked(g);
                return (
                  <label
                    key={g.id}
                    className={`flex cursor-pointer items-center gap-3 bg-card px-3 py-2.5 ${i ? "border-t border-line" : ""} ${state === "locked" ? "cursor-not-allowed opacity-55" : "hover:bg-card2"}`}
                  >
                    <input
                      type="checkbox"
                      checked={state === "locked" ? false : ticked}
                      disabled={state === "locked" || busy}
                      onChange={(e) => setPicked((p) => ({ ...p, [g.id]: e.target.checked }))}
                      className="h-4 w-4 shrink-0 accent-[var(--acc)]"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13.5px] font-extrabold">{g.artistName || g.title}</span>
                      <span className="mt-0.5 block text-[11px] font-bold text-dim">
                        {prettyDate(g.date)}{g.startTime ? ` · ${formatTime(g.startTime)}` : ""}
                      </span>
                    </span>
                    {state === "locked" && (
                      <span className="flex shrink-0 items-center gap-1 text-[10px] font-black text-dim"><Lock size={11} /> {g.festivalName || "Another festival"}</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {note && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-txt">{note}</p>}
      {gigs.length > 0 && (
        <button type="button" onClick={save} disabled={!dirty || busy} className="bndy-btn2 mt-4 flex w-full items-center justify-center gap-2 py-3 text-[13.5px] font-black disabled:opacity-50">
          {busy ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Save gig changes
        </button>
      )}
    </section>
  );
}
