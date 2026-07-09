"use client";

import { useRouter } from "next/navigation";
import { ChevronLeft, Facebook, Instagram, Youtube, Globe, Music2, Share2 } from "lucide-react";
import type { SocialLink, SocialPlatform } from "@/domain/types";

const ICON: Record<SocialPlatform, typeof Globe> = {
  facebook: Facebook, instagram: Instagram, youtube: Youtube, spotify: Music2, x: Globe, website: Globe, other: Globe,
};

export function HeroBack() {
  const router = useRouter();
  return (
    <button onClick={() => router.back()} aria-label="Back"
      className="absolute left-3 top-3 z-10 flex h-9 items-center gap-1 rounded-full border border-white/20 bg-black/45 pl-2 pr-3 text-[13px] font-bold text-white backdrop-blur-sm transition hover:bg-black/65 lg:left-6 lg:top-5">
      <ChevronLeft size={17} /> Back
    </button>
  );
}

export function HeroSocials({ socials, name }: { socials?: SocialLink[]; name: string }) {
  const share = () => {
    if (typeof window === "undefined") return;
    const url = window.location.href;
    if (navigator.share) navigator.share({ title: name, url }).catch(() => {});
    else navigator.clipboard?.writeText(url).catch(() => {});
  };
  return (
    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 lg:right-6 lg:top-5">
      {(socials ?? []).slice(0, 3).map((l) => {
        const Icon = ICON[l.platform] ?? Globe;
        return (
          <a key={l.url} href={l.url} target="_blank" rel="noopener" aria-label={l.platform}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65">
            <Icon size={16} />
          </a>
        );
      })}
      <button onClick={share} aria-label="Share" className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65">
        <Share2 size={16} />
      </button>
    </div>
  );
}
