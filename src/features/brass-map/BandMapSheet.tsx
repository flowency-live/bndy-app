"use client";

import Link from "next/link";
import { MapPin, X } from "lucide-react";
import type { BrassBand } from "@/editions/brass-api";

export function BandMapSheet({ band, onClose }: { band: BrassBand | null; onClose: () => void }) {
  if (!band) return null;

  return (
    <div className="fixed inset-x-3 bottom-20 z-50 mx-auto max-w-md rounded-2xl border border-line bg-card p-4 shadow-[var(--shadow)] lg:bottom-6 lg:left-auto lg:right-6 lg:mx-0">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[18px] font-black tracking-tight">{band.name}</div>
          {band.location && (
            <div className="mt-1 flex items-center gap-1.5 text-[12px] font-semibold text-dim">
              <MapPin size={13} className="text-[var(--acc)]" />
              <span className="truncate">{band.location}</span>
            </div>
          )}
        </div>
        <button onClick={onClose} aria-label="Close band" className="rounded-lg p-1.5 text-dim hover:text-txt">
          <X size={17} />
        </button>
      </div>
      <Link href={`/bands/${band.id}`} className="mt-4 block rounded-xl bg-acc px-4 py-2.5 text-center text-[12px] font-extrabold text-on-acc">
        View band
      </Link>
    </div>
  );
}
