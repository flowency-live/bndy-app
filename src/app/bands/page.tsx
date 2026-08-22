"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { useBrassBands } from "@/editions/hooks";

export default function BandsPage() {
  const { data: bands = [], isLoading, error } = useBrassBands();
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return bands;
    return bands.filter((band) => `${band.name} ${band.location} ${band.nameVariants.join(" ")} ${band.names.map((n) => n.name).join(" ")}`.toLowerCase().includes(q));
  }, [bands, query]);

  return <div className="mx-auto max-w-6xl px-4 pb-24 lg:px-8">
    <div className="mb-6 flex items-end justify-between gap-4"><div><div className="text-[10px] font-black uppercase tracking-[1.7px] text-[var(--acc)]">bndy Brass</div><h1 className="mt-1 text-3xl font-black tracking-tight">Bands</h1></div><div className="tnum text-2xl font-black">{isLoading ? "…" : filtered.length}</div></div>
    <div className="relative mb-5"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dim" size={16}/><input value={query} onChange={(e)=>setQuery(e.target.value)} placeholder="Search bands or locations…" className="h-11 w-full rounded-2xl border border-line bg-card pl-10 pr-4 text-sm font-bold outline-none focus:border-[var(--acc)]" /></div>
    {error && <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm">Could not load brass Bands.</div>}
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((band) => <Link key={band.id} href={`/bands/${band.id}`} className="rounded-2xl border border-line bg-card p-4 transition hover:border-[var(--acc)] hover:bg-card2"><div className="flex gap-3"><div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-card2 font-black text-[var(--acc2)]">{band.profileImageUrl ? <img src={band.profileImageUrl} alt="" className="h-full w-full object-cover"/> : band.name.slice(0,2).toUpperCase()}</div><div className="min-w-0"><h2 className="truncate text-base font-black">{band.name}</h2><p className="mt-1 truncate text-xs text-dim">{band.location || "Location being verified"}</p><p className="mt-2 text-[9px] font-black uppercase tracking-[1.2px] text-[var(--acc)]">{band.claimStatus === "claimed" ? "Claimed" : "Profile building"}</p></div></div></Link>)}</div>
  </div>;
}
