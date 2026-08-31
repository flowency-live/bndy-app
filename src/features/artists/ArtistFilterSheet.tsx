"use client";

import { Sheet } from "@/components/ui/Sheet";
import { cn } from "@/lib/cn";
import type { ArtistTaxonomy } from "@/lib/artistTaxonomyCore";
import { topTowns, type BrowseFilters, type FacetCounts } from "./browseFilters";

function Opt({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[12.5px] font-bold transition-colors",
        on ? "border-transparent bg-acc text-on-acc" : "border-line text-dim hover:text-txt",
      )}
    >
      {label}
      {count !== undefined && <span className="font-meta ml-1.5 text-[9.5px] opacity-70">{count}</span>}
    </button>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <h3 className="font-meta mb-2 text-[10px] font-extrabold uppercase tracking-[1.4px] text-dim2">{title}</h3>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** Facet picker. Counts come from the caller and exclude the dimension being
 *  shown, so an option never reads zero while still being selectable. */
export function ArtistFilterSheet({ open, onClose, filters, counts, taxonomy, resultCount, onToggle, onClear }: {
  open: boolean;
  onClose: () => void;
  filters: BrowseFilters;
  counts: FacetCounts;
  taxonomy: ArtistTaxonomy;
  resultCount: number;
  onToggle: (key: "genres" | "artistTypes" | "actTypes" | "towns", value: string) => void;
  onClear: () => void;
}) {
  const towns = topTowns(counts.towns);

  return (
    <Sheet open={open} onClose={onClose}>
      <h2 className="disp mb-4 text-lg text-txt">Filter artists</h2>

      <Group title="Genre">
        {taxonomy.genres.map((g) => (
          <Opt key={g} label={g} count={counts.genres.get(g) ?? 0} on={filters.genres.includes(g)} onClick={() => onToggle("genres", g)} />
        ))}
      </Group>

      <Group title="Band or solo">
        {taxonomy.artistTypes.map((t) => (
          <Opt key={t.value} label={t.label} count={counts.artistTypes.get(t.value) ?? 0} on={filters.artistTypes.includes(t.value)} onClick={() => onToggle("artistTypes", t.value)} />
        ))}
      </Group>

      <Group title="What they play">
        {taxonomy.actTypes.map((t) => (
          <Opt key={t.value} label={t.label} count={counts.actTypes.get(t.value) ?? 0} on={filters.actTypes.includes(t.value)} onClick={() => onToggle("actTypes", t.value)} />
        ))}
      </Group>

      {towns.length > 0 && (
        <Group title="Area">
          {towns.map((t) => (
            <Opt key={t} label={t} count={counts.towns.get(t) ?? 0} on={filters.towns.includes(t)} onClick={() => onToggle("towns", t)} />
          ))}
        </Group>
      )}

      <div className="sticky bottom-0 -mx-5 flex gap-2 border-t border-line bg-[var(--card)] px-5 pb-1 pt-3">
        <button type="button" onClick={onClear} className="bndy-btn2 flex-1 py-3 text-[14px]">Clear all</button>
        <button type="button" onClick={onClose} className="bndy-btn flex-1 py-3 text-[14px]">
          Show {resultCount.toLocaleString()} act{resultCount === 1 ? "" : "s"}
        </button>
      </div>
    </Sheet>
  );
}
