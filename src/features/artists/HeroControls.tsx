"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronLeft, Facebook, Instagram, Youtube, Globe, Music2, Share2 } from "lucide-react";
import { ShareSheet } from "@/features/shared/ShareSheet";
import { safeHref } from "@/lib/safeHref";
import type { SocialLink, SocialPlatform } from "@/domain/types";

const ICON: Record<SocialPlatform, typeof Globe> = {
  facebook: Facebook, instagram: Instagram, youtube: Youtube, spotify: Music2, soundcloud: Music2, bandcamp: Music2, x: Globe, website: Globe, other: Globe,
};

export function HeroBack({ inline }: { inline?: boolean }) {
  const router = useRouter();
  return (
    <button type="button" onClick={() => router.back()} aria-label="Back"
      className={inline
        ? "flex h-9 items-center gap-1 rounded-full border border-line glass pl-2 pr-3 text-[13px] font-bold text-txt transition hover:bg-white/5"
        : "absolute left-3 top-3 z-10 flex h-9 items-center gap-1 rounded-full border border-white/40 bg-black/70 pl-2 pr-3 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-black/80 lg:left-6 lg:top-5"}>
      <ChevronLeft size={17} /> Back
    </button>
  );
}

export function HeroSocials({ socials, name, inline }: { socials?: SocialLink[]; name: string; inline?: boolean }) {
  const [sharing, setSharing] = useState(false);
  const btn = inline
    ? "flex h-9 w-9 items-center justify-center rounded-full border border-line glass text-dim transition hover:text-txt"
    : "flex h-9 w-9 items-center justify-center rounded-full border border-white/40 bg-black/70 text-white backdrop-blur-sm transition hover:bg-black/80";
  return (
    <div className={inline ? "flex items-center gap-1.5" : "absolute right-14 top-3 z-10 flex items-center gap-1.5 lg:right-6 lg:top-5"}>
      {(socials ?? []).slice(0, 3).map((l) => {
        const Icon = ICON[l.platform] ?? Globe;
        return <a key={l.url} href={safeHref(l.url)} target="_blank" rel="noopener noreferrer" aria-label={l.platform} className={btn}><Icon size={16} /></a>;
      })}
      <button type="button" onClick={() => setSharing(true)} aria-label={`Share ${name}`} title="Share" className={btn}><Share2 size={16} /></button>
      <ShareSheet open={sharing} onClose={() => setSharing(false)} url={typeof window !== "undefined" ? window.location.href : ""} title={`Share ${name}`} text={`${name} on bndy · keeping live music alive`} />
    </div>
  );
}
