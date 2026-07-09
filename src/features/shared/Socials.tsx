import { Facebook, Globe, Instagram, Youtube, Music2 } from "lucide-react";
import type { SocialLink, SocialPlatform } from "@/domain/types";

const ICON: Record<SocialPlatform, typeof Globe> = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  spotify: Music2,
  x: Globe,
  website: Globe,
  other: Globe,
};

export function Socials({ links }: { links?: SocialLink[] }) {
  if (!links?.length) return null;
  return (
    <div className="flex justify-center gap-2.5">
      {links.slice(0, 5).map((l) => {
        const Icon = ICON[l.platform] ?? Globe;
        return (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noopener"
            aria-label={l.platform}
            className="flex h-11 w-11 items-center justify-center rounded-[13px] border border-line glass text-txt transition-transform active:scale-90"
          >
            <Icon size={20} />
          </a>
        );
      })}
    </div>
  );
}
