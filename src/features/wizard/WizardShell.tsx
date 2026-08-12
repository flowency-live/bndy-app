"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Check, Loader2, PartyPopper, RotateCcw, Share2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useArtists, useVenues } from "@/lib/hooks";
import { formatTime } from "@/domain/dates";
import { cn } from "@/lib/cn";
import { seriesDates } from "@/domain/recurrence";
import { clearDraft, EMPTY_DRAFT, inferTitle, loadDraft, saveDraft, type Draft } from "./lib";
import { createCommunityEvent, resolveArtist } from "./wizardApi";
import { PreviewCard } from "./PreviewCard";
import { StepVenue } from "./StepVenue";
import { StepArtist } from "./StepArtist";
import { StepWhen } from "./StepWhen";

type StepKey = "venue" | "artist" | "when" | "review";
type Phase = "idle" | "artist" | "event";
type Outcome = { kind: "published"; eventId?: string; count?: number; dups?: number } | { kind: "duplicate" } | null;

export function WizardShell() {
  const params = useSearchParams();
  const prefillArtistId = params.get("artistId");
  const prefillVenueId = params.get("venueId");
  const { data: artists = [] } = useArtists();
  const { data: venues = [] } = useVenues();
  const queryClient = useQueryClient();

  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [step, setStep] = useState<StepKey>("venue");
  const [phase, setPhase] = useState<Phase>("idle");
  const [outcome, setOutcome] = useState<Outcome>(null);
  const [error, setError] = useState<string | null>(null);
  const hydrated = useRef(false);
  const startedAt = useRef(Date.now()); // bot time-trap: server rejects publishes <3s after open

  // hydrate from sessionStorage once, then apply URL prefills when caches land.
  // A prefilled entry point that does NOT match the stored draft is a NEW gig intent:
  // start clean (only the prefill anchor gets applied) instead of resuming an old
  // half-finished draft and skipping straight to review.
  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      let d = loadDraft();
      const venueMismatch = prefillVenueId && d.venueId !== prefillVenueId;
      const artistMismatch = prefillArtistId && d.artistId !== prefillArtistId;
      if (venueMismatch || artistMismatch) d = { ...EMPTY_DRAFT };
      setDraft(d);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const artistPrefillDone = useRef(false);
  const venuePrefillDone = useRef(false);
  useEffect(() => {
    if (prefillArtistId && artists.length && !artistPrefillDone.current) {
      const a = artists.find((x) => x.id === prefillArtistId);
      if (a) { artistPrefillDone.current = true; setDraft((d) => (d.artistId === a.id ? d : { ...d, artistId: a.id, artistName: a.name, newArtist: undefined })); }
    }
  }, [prefillArtistId, artists]);
  useEffect(() => {
    if (prefillVenueId && venues.length && !venuePrefillDone.current) {
      const v = venues.find((x) => x.id === prefillVenueId);
      if (v) { venuePrefillDone.current = true; setDraft((d) => (d.venueId === v.id ? d : { ...d, venueId: v.id, venueName: v.name, venueCity: v.city })); }
    }
  }, [prefillVenueId, venues]);
  useEffect(() => { if (hydrated.current) saveDraft(draft); }, [draft]);

  const patch = (p: Partial<Draft>) => setDraft((d) => {
    const next = { ...d, ...p };
    if (!next.titleTouched) next.title = inferTitle(next.artistName ?? next.newArtist?.name, next.venueName, next.isOpenMic);
    return next;
  });

  const venueDone = !!draft.venueId;
  const artistDone = !!draft.artistId || !!draft.newArtist || !!draft.isOpenMic;
  const whenDone = !!draft.date && !!draft.startTime;

  // auto-advance to the first incomplete step on load/prefill
  useEffect(() => {
    setStep(!venueDone ? "venue" : !artistDone ? "artist" : !whenDone ? "when" : "review");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venueDone, artistDone]);

  const steps: { key: StepKey; label: string; done: boolean; locked: boolean }[] = [
    { key: "venue", label: "Where", done: venueDone, locked: !!prefillVenueId && venueDone },
    { key: "artist", label: "Who", done: artistDone, locked: !!prefillArtistId && !!draft.artistId },
    { key: "when", label: "When", done: whenDone, locked: false },
    { key: "review", label: "Publish", done: false, locked: false },
  ];

  const publish = async () => {
    if (!draft.venueId || !draft.date || !draft.startTime) return;
    setError(null);
    try {
      // 1) resolve/create the artist if new (open mics skip this: host is optional
      //    and always an EXISTING act — StepArtist never offers new-artist creation there)
      let artistId = draft.artistId;
      let artistName = draft.artistName;
      if (!artistId && !draft.isOpenMic && draft.newArtist) {
        setPhase("artist");
        let r = await resolveArtist(
          {
            name: draft.newArtist.name,
            location: draft.newArtist.location,
            facebookUrl: draft.newArtist.facebookUrl,
            genres: draft.newArtist.genres,
            artistType: draft.newArtist.artistType,
            actType: draft.newArtist.actType,
          },
          { confirmNew: draft.newArtist.confirmNew },
        );
        if (!((r.action === "matched" || r.action === "created") && r.artistId) && r.action !== "review") {
          // Self-heal (bug observed 2026-08-07): the create can land server-side even when
          // the response is an error (422 seen AFTER the artist record existed). Re-check
          // read-only; if the artist is there now, carry on to the event instead of stranding.
          const recheck = await resolveArtist(
            { name: draft.newArtist.name, location: draft.newArtist.location, facebookUrl: draft.newArtist.facebookUrl },
            { dryRun: true },
          );
          if (recheck.action === "matched" && recheck.artistId) r = recheck;
        }
        if ((r.action === "matched" || r.action === "created") && r.artistId) {
          artistId = r.artistId;
          artistName = r.artistName ?? draft.newArtist.name;
          patch({ artistId, artistName, newArtist: undefined });
        } else if (r.action === "review") {
          setPhase("idle");
          setStep("artist");
          setError("We need another look at that artist. Check the suggestions.");
          return;
        } else {
          setPhase("idle");
          setError(`${r.message ?? "Couldn't add that artist. Check the details."}${r.code ? ` (${r.code})` : ""}`);
          return;
        }
      }
      if (!artistId && !draft.isOpenMic) { setStep("artist"); return; }

      // 2) create the gig — or the whole series for a repeating open mic (item 13):
      //    each date is its own event; the server dedup gate absorbs re-runs.
      setPhase("event");
      const title = draft.titleTouched && draft.title ? draft.title : inferTitle(artistName, draft.venueName, draft.isOpenMic);
      const dates = draft.isOpenMic && draft.repeat
        ? seriesDates(draft.date, draft.repeat.pattern, draft.repeat.until)
        : [draft.date];
      let ok = 0, dups = 0;
      let firstEventId: string | undefined;
      let lastError: string | undefined;
      for (const date of dates) {
        const res = await createCommunityEvent({
          artistId,
          isOpenMic: draft.isOpenMic || undefined,
          venueId: draft.venueId,
          date,
          startTime: draft.startTime,
          endTime: draft.endTime,
          title: title || undefined,
          ticketed: draft.ticketed || undefined,
          ticketUrl: draft.ticketUrl,
          ticketInformation: draft.ticketInfo,
          imageUrl: draft.posterUrl,
          description: draft.info,
          hp: "",
          startedAt: startedAt.current,
        });
        if (res.ok) { ok += 1; if (!firstEventId) firstEventId = res.eventId; }
        else if (res.existingEventId || res.error === "duplicate") dups += 1;
        else { lastError = res.error; break; }
      }
      setPhase("idle");
      if (ok > 0) {
        // A2 fix: invalidate gigs cache so the new event appears immediately
        // C5 fix: the wizard can also create a NEW artist and a NEW venue.
        // Clear those caches too, or the new record stays hidden until the
        // cache expires.
        queryClient.invalidateQueries({ queryKey: ["gigs"] });
        queryClient.invalidateQueries({ queryKey: ["artists"] });
        queryClient.invalidateQueries({ queryKey: ["venues"] });
        setOutcome({ kind: "published", eventId: firstEventId, count: ok, dups });
        clearDraft();
      }
      else if (dups > 0) { setOutcome({ kind: "duplicate" }); clearDraft(); }
      else setError(lastError ?? "Publishing failed. Nothing was lost, try again.");
    } catch {
      setPhase("idle");
      setError("Network hiccup. Nothing was lost, try again.");
    }
  };

  const shareGig = async () => {
    const text = `${draft.title || `${draft.artistName} @ ${draft.venueName}`}${draft.venueCity ? `, ${draft.venueCity}` : ""} · ${draft.date}${draft.startTime ? ` · ${formatTime(draft.startTime)}` : ""} · on bndy`;
    const url = `${window.location.origin}/gigs`;
    try {
      if (navigator.share) await navigator.share({ title: "bndy gig", text, url });
      else await navigator.clipboard.writeText(`${text}\n${url}`);
    } catch { /* dismissed */ }
  };

  /** Reset for the next gig, keeping the chosen anchor (artist / venue / both). */
  const again = (keep: "artist" | "venue" | "both" | "none") => {
    const base: Draft = { ...EMPTY_DRAFT };
    if (keep === "artist" || keep === "both") { base.artistId = draft.artistId; base.artistName = draft.artistName; }
    if (keep === "venue" || keep === "both") { base.venueId = draft.venueId; base.venueName = draft.venueName; base.venueCity = draft.venueCity; }
    base.title = inferTitle(base.artistName, base.venueName);
    setOutcome(null);
    setError(null);
    setDraft(base);
    setStep(keep === "both" ? "when" : keep === "venue" ? "artist" : "venue");
  };

  /* ---------------- outcome screens ---------------- */
  if (outcome) {
    const dup = outcome.kind === "duplicate";
    const many = outcome.kind === "published" && (outcome.count ?? 1) > 1;
    return (
      <div className="mx-auto max-w-md px-4 pb-24 pt-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-acc text-on-acc">
          {dup ? <Check size={26} strokeWidth={3} /> : <PartyPopper size={26} />}
        </div>
        <h1 className="mt-4 text-[24px] font-black tracking-tight">
          {dup ? "Already listed!" : many ? `${outcome.count} nights are live!` : "Your gig is live!"}
        </h1>
        <p className="mt-1.5 text-[14px] font-semibold text-dim">
          {dup
            ? "Good news: this gig is already on bndy, so there's nothing to do."
            : many
              ? `The whole series is on the map and in the gig list right now.${outcome.kind === "published" && outcome.dups ? ` ${outcome.dups} of the dates were already listed.` : ""}`
              : "It's on the map and in the gig list right now."}
        </p>
        <div className="mt-5 text-left"><PreviewCard draft={draft.title ? draft : { ...draft }} /></div>
        <div className="mt-5 flex flex-col gap-2.5">
          {!dup && (
            <button onClick={shareGig} className="bndy-btn flex items-center justify-center gap-2 py-3.5 text-[14px]">
              <Share2 size={16} /> Share it
            </button>
          )}
          <Link href="/map" className="bndy-btn2 flex items-center justify-center py-3.5 text-[14px]">See it on the map</Link>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          <div className="text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim2">Add another gig</div>
          <div className="mt-2.5 flex flex-col gap-2">
            {draft.artistId && draft.venueId && (
              <button onClick={() => again("both")} className="bndy-btn2 truncate px-4 py-3 text-[13.5px]">
                {draft.artistName} at {draft.venueName}, another date
              </button>
            )}
            {draft.artistId && (
              <button onClick={() => again("artist")} className="bndy-btn2 truncate px-4 py-3 text-[13.5px]">
                Another gig for {draft.artistName}
              </button>
            )}
            {draft.venueId && (
              <button onClick={() => again("venue")} className="bndy-btn2 truncate px-4 py-3 text-[13.5px]">
                Another gig at {draft.venueName}
              </button>
            )}
            <button onClick={() => again("none")} className="py-1.5 text-[13px] font-extrabold text-dim hover:text-txt">
              Start fresh
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ---------------- wizard ---------------- */
  const stepIndex = steps.findIndex((s) => s.key === step);
  // Jason 2026-08-11: the draft cache survives refreshes BY DESIGN (app-flips for
  // a Facebook URL), so there must be an explicit way out of a changed mind.
  const dirty = venueDone || artistDone || !!draft.date;
  const startOver = () => {
    clearDraft();
    setDraft({ ...EMPTY_DRAFT });
    setOutcome(null);
    setError(null);
    setStep("venue");
  };
  return (
    <div className="mx-auto max-w-5xl px-4 pb-28 pt-2 lg:px-8">
      <div className="mb-5 flex items-center gap-3">
        {/* slot always rendered: appearing/disappearing shifted the heading by a few px between steps */}
        <button
          onClick={() => setStep(steps[stepIndex - 1].key)}
          aria-label="Back"
          disabled={stepIndex === 0 || steps[stepIndex - 1].locked}
          className={cn("flex h-9 w-9 items-center justify-center rounded-full border border-line glass transition-opacity", (stepIndex === 0 || steps[stepIndex - 1].locked) && "pointer-events-none opacity-0")}
        >
          <ArrowLeft size={16} />
        </button>
        <h1 className="text-[22px] font-black tracking-tight">Add a gig</h1>
        {dirty && (
          <button
            onClick={startOver}
            title="Clear everything and start a fresh gig"
            className="flex items-center gap-1 rounded-full border border-line glass px-2.5 py-1.5 text-[11px] font-extrabold uppercase tracking-wide text-dim transition-colors hover:text-txt"
          >
            <RotateCcw size={12} /> Start over
          </button>
        )}
        <div className="ml-auto flex items-center gap-1.5">
          {steps.map((s, i) => (
            <button
              key={s.key}
              disabled={s.locked || (!s.done && i > stepIndex)}
              onClick={() => setStep(s.key)}
              aria-label={s.label}
              className={cn("h-2 rounded-full transition-all duration-300", s.key === step ? "w-6" : "w-2", (s.done || s.key === step) ? "" : "opacity-40")}
              style={{ background: s.key === step ? "var(--acc)" : s.done ? "var(--acc2)" : "var(--dim2)" }}
            />
          ))}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div>
          {step === "venue" && <StepVenue onPick={(v) => { patch({ venueId: v.id, venueName: v.name, venueCity: v.city }); setStep("artist"); }} />}
          {step === "artist" && (
            <StepArtist
              venueId={draft.venueId}
              venueCity={draft.venueCity}
              initialOpenMic={!!draft.isOpenMic}
              onPickExisting={(a) => { patch({ artistId: a.id, artistName: a.name, newArtist: undefined, isOpenMic: undefined, repeat: undefined }); setStep("when"); }}
              onPickNew={(na) => { patch({ newArtist: na, artistId: undefined, artistName: undefined, isOpenMic: undefined, repeat: undefined }); setStep("when"); }}
              onPickOpenMic={(host) => { patch({ isOpenMic: true, artistId: host?.id, artistName: host?.name, newArtist: undefined }); setStep("when"); }}
            />
          )}
          {step === "when" && <StepWhen draft={draft} onDone={(p) => { patch(p); setStep("review"); }} />}
          {step === "review" && (
            <div>
              <h2 className="text-[19px] font-black tracking-tight">Check &amp; publish</h2>
              <label className="mt-3 block">
                <span className="mb-1 block text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim">Gig title <span className="text-dim2">(tap to change)</span></span>
                <input
                  value={draft.title ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value, titleTouched: true }))}
                  className="w-full rounded-2xl border border-line glass px-4 py-3 text-[15px] font-extrabold outline-none focus:border-orange/55"
                />
              </label>
              <div className="mt-4 lg:hidden"><PreviewCard draft={draft} /></div>
              {error && <p className="mt-3 rounded-xl bg-card2 px-3.5 py-3 text-[13px] font-bold text-[var(--acc)]">{error}</p>}
              <button onClick={publish} disabled={phase !== "idle"} className="bndy-btn mt-5 flex w-full items-center justify-center gap-2 py-4 text-[15px] disabled:opacity-60">
                {phase !== "idle" ? (
                  <><Loader2 size={17} className="animate-spin" /> {phase === "artist" ? "Adding the artist…" : "Publishing…"}</>
                ) : (
                  <><Check size={17} /> Publish gig</>
                )}
              </button>
              <p className="mt-2.5 text-center text-[11.5px] font-semibold text-dim2">Free to list, free to discover. Keeping LIVE music ALIVE.</p>
            </div>
          )}
        </div>

        {/* live preview — desktop rail (mobile shows it on the review step) */}
        <aside className="hidden lg:block">
          <div className="sticky top-6">
            <div className="mb-2 text-[11px] font-extrabold uppercase tracking-[1.2px] text-dim2">Your gig so far</div>
            <PreviewCard draft={draft} />
          </div>
        </aside>
      </div>
    </div>
  );
}
