"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Check, ChevronDown, Mic, SlidersHorizontal } from "lucide-react";
import { Sheet } from "@/components/ui/Sheet";
import { GENRES, ACT_TYPES, ARTIST_TYPES } from "@/features/wizard/lib";
import { useAuth } from "@/lib/auth/AuthProvider";
import { useTheme } from "@/lib/theme";
import { cn } from "@/lib/cn";
import {
  EMPTY_GIG_FILTER,
  describeGigFilter,
  hasGigFilterCriteria,
  useMyGigFilter,
  useSaveMyGigFilter,
  useToggleMyGigFilter,
} from "@/lib/myGigFilter";
import type { GigFilter } from "@/lib/auth/authApi";

const OPEN_EVENT = "bndy:open-gig-filter";

export function openGigFilterPreferences() {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

function myGigsColour(mode: "light" | "dark") {
  // Semantic pink: same identity on every skin, tuned for contrast by light/dark family.
  return mode === "dark" ? "#ff5ca8" : "#c026d3";
}

function onPink(mode: "light" | "dark") {
  return mode === "dark" ? "#240914" : "#ffffff";
}

export function MyGigFilterHost() {
  const { isAuthenticated } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, show);
    return () => window.removeEventListener(OPEN_EVENT, show);
  }, []);

  if (!isAuthenticated) return null;
  return <MyGigFilterSheet open={open} onClose={() => setOpen(false)} />;
}

export function MyGigsQuickControl() {
  const { isAuthenticated } = useAuth();
  const { mode } = useTheme();
  const { hasCriteria, isActive, criteriaCount, isLoading } = useMyGigFilter();
  const { toggle, isPending } = useToggleMyGigFilter();
  const pink = myGigsColour(mode);
  const ink = onPink(mode);

  if (!isAuthenticated) return null;

  const onClick = () => {
    if (!hasCriteria) openGigFilterPreferences();
    else toggle();
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isLoading || isPending}
      aria-pressed={isActive}
      aria-label={hasCriteria ? `My gigs filter ${isActive ? "on" : "off"}` : "Set up My gigs filter"}
      title={hasCriteria ? `My gigs: ${isActive ? "on" : "off"}. Edit in your profile menu.` : "Set up My gigs"}
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom,0px))] left-[8.25rem] z-40 flex h-12 min-w-[82px] items-center justify-center gap-1.5 rounded-full border px-3 shadow-[var(--shadow)] transition-[background-color,border-color,box-shadow,transform] active:scale-95 disabled:opacity-50 lg:hidden"
      style={isActive
        ? { background: pink, borderColor: pink, color: ink, boxShadow: `0 0 0 1px color-mix(in srgb, ${pink} 32%, transparent), 0 0 20px color-mix(in srgb, ${pink} 34%, transparent)` }
        : { background: `color-mix(in srgb, ${pink} 8%, var(--glass-hi))`, borderColor: `color-mix(in srgb, ${pink} 46%, var(--line))`, color: pink }}
    >
      <SlidersHorizontal size={17} strokeWidth={2.5} />
      <span className="text-[10.5px] font-black whitespace-nowrap">My gigs</span>
      {criteriaCount > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-ink px-1 text-[8px] font-black tnum"
          style={{ background: pink, color: ink }}
        >
          {criteriaCount > 9 ? "9+" : criteriaCount}
        </span>
      )}
    </button>
  );
}

function MyGigFilterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { mode } = useTheme();
  const pink = myGigsColour(mode);
  const pinkText = onPink(mode);
  const { filter } = useMyGigFilter();
  const save = useSaveMyGigFilter();
  const [draft, setDraft] = useState<GigFilter>(EMPTY_GIG_FILTER);
  const [genresOpen, setGenresOpen] = useState(false);

  useEffect(() => {
    if (open) {
      setDraft({
        ...filter,
        genres: [...filter.genres],
        actTypes: [...filter.actTypes],
        artistTypes: [...filter.artistTypes],
      });
      setGenresOpen(false);
    }
  }, [open, filter]);

  const toggleGenre = (genre: string) => setDraft((prev) => ({
    ...prev,
    genres: prev.genres.includes(genre) ? prev.genres.filter((x) => x !== genre) : [...prev.genres, genre],
  }));
  const toggleAct = (actType: string) => setDraft((prev) => ({
    ...prev,
    actTypes: prev.actTypes.includes(actType) ? prev.actTypes.filter((x) => x !== actType) : [...prev.actTypes, actType],
  }));
  const toggleArtistType = (artistType: string) => setDraft((prev) => ({
    ...prev,
    artistTypes: prev.artistTypes.includes(artistType) ? prev.artistTypes.filter((x) => x !== artistType) : [...prev.artistTypes, artistType],
  }));

  const hasCriteria = hasGigFilterCriteria(draft);
  const summary = useMemo(() => describeGigFilter(draft), [draft]);
  const genreSummary = draft.genres.length === 0
    ? "Any genre"
    : `${draft.genres.slice(0, 3).join(", ")}${draft.genres.length > 3 ? ` +${draft.genres.length - 3}` : ""}`;

  const saveAndClose = () => {
    const next = { ...draft, enabled: hasCriteria };
    save.mutate(next, { onSuccess: onClose });
  };

  return (
    <Sheet open={open} onClose={onClose}>
      <div className="pr-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${pink} 16%, transparent)`, color: pink }}>
            <SlidersHorizontal size={19} />
          </span>
          <div>
            <h2 className="text-[20px] font-black tracking-tight text-txt">My gig preferences</h2>
            <p className="mt-0.5 text-[11.5px] font-semibold text-dim">Saved to your account · used on Map and Gigs</p>
          </div>
        </div>
      </div>

      <FilterSection title="They are" sub="Artist type">
        <div className="flex flex-wrap gap-1.5">
          {ARTIST_TYPES.map((type) => (
            <ChoiceChip key={type} selected={draft.artistTypes.includes(type)} colour={pink} selectedText={pinkText} onClick={() => toggleArtistType(type)}>
              {type}
            </ChoiceChip>
          ))}
        </div>
      </FilterSection>

      <FilterSection title="They play" sub="Act type">
        <div className="flex flex-wrap gap-1.5">
          {ACT_TYPES.map((type) => (
            <ChoiceChip key={type.value} selected={draft.actTypes.includes(type.value)} colour={pink} selectedText={pinkText} onClick={() => toggleAct(type.value)}>
              {type.label}
            </ChoiceChip>
          ))}
        </div>
      </FilterSection>

      <section className="mt-5 overflow-hidden rounded-2xl border border-line">
        <button
          type="button"
          onClick={() => setGenresOpen((v) => !v)}
          aria-expanded={genresOpen}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
        >
          <span className="min-w-0">
            <span className="block text-[12px] font-black text-txt">Genres</span>
            <span className="mt-0.5 block truncate text-[10.5px] font-semibold text-dim">{genreSummary}</span>
          </span>
          <ChevronDown size={16} className={cn("shrink-0 text-dim transition-transform", genresOpen && "rotate-180")} />
        </button>
        {genresOpen && (
          <div className="border-t border-line px-4 pb-4 pt-3">
            <div className="flex flex-wrap gap-1.5">
              {GENRES.map((genre) => (
                <ChoiceChip key={genre} selected={draft.genres.includes(genre)} colour={pink} selectedText={pinkText} onClick={() => toggleGenre(genre)}>
                  {genre}
                </ChoiceChip>
              ))}
            </div>
          </div>
        )}
      </section>

      <FilterSection title="Also show">
        <button
          type="button"
          onClick={() => setDraft((prev) => ({ ...prev, includeOpenMic: !prev.includeOpenMic }))}
          aria-pressed={draft.includeOpenMic}
          className="flex items-center gap-2 rounded-full border px-3 py-2 text-[12px] font-extrabold transition-colors"
          style={draft.includeOpenMic
            ? { background: "#facc15", borderColor: "#facc15", color: "#171717" }
            : { borderColor: "color-mix(in srgb, #facc15 48%, var(--line))", color: "#eab308", background: "color-mix(in srgb, #facc15 7%, var(--glass))" }}
        >
          <Mic size={15} strokeWidth={2.5} /> Open Mic
          {draft.includeOpenMic && <Check size={14} strokeWidth={3} />}
        </button>
      </FilterSection>

      <div className="mt-5 rounded-2xl border border-line bg-card/60 px-4 py-3">
        <div className="font-meta text-[9px] font-extrabold uppercase tracking-[1.5px] text-dim2">Your filter</div>
        <p className="mt-1.5 text-[12.5px] font-bold leading-relaxed text-txt">{summary}</p>
      </div>

      {save.isError && <p className="mt-3 text-[12px] font-bold text-red-400">Couldn’t save your preferences. Please try again.</p>}

      <div className="mt-5 flex gap-2.5">
        <button
          type="button"
          onClick={() => setDraft(EMPTY_GIG_FILTER)}
          disabled={save.isPending}
          className="rounded-2xl border border-line px-4 py-3 text-[13px] font-extrabold text-dim transition-colors hover:text-txt disabled:opacity-50"
        >
          Clear
        </button>
        <button
          type="button"
          onClick={saveAndClose}
          disabled={save.isPending || !hasCriteria}
          className="flex-1 rounded-2xl px-4 py-3 text-[13.5px] font-black transition-opacity disabled:opacity-40"
          style={{ background: pink, color: pinkText }}
        >
          {save.isPending ? "Saving…" : "Save & use My gigs"}
        </button>
      </div>
    </Sheet>
  );
}

function FilterSection({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section className="mt-5">
      <div className="mb-2">
        <h3 className="text-[12px] font-black text-txt">{title}</h3>
        {sub && <p className="text-[10.5px] font-semibold text-dim2">{sub}</p>}
      </div>
      {children}
    </section>
  );
}

function ChoiceChip({ selected, colour, selectedText, onClick, children }: { selected: boolean; colour: string; selectedText: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn("flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11.5px] font-bold transition-colors", !selected && "text-dim hover:text-txt")}
      style={selected
        ? { background: colour, borderColor: colour, color: selectedText }
        : { borderColor: `color-mix(in srgb, ${colour} 24%, var(--line))`, background: `color-mix(in srgb, ${colour} 3%, var(--glass))` }}
    >
      {children}{selected && <Check size={12} strokeWidth={3} />}
    </button>
  );
}
