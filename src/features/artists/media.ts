import type { SocialLink } from "@/domain/types";

export type MediaProvider = "youtube" | "spotify" | "soundcloud" | "bandcamp";

export interface ArtistMediaItem {
  provider: MediaProvider;
  url: string;
  embedUrl?: string;
  videoId?: string;
}

const HOSTS: Record<MediaProvider, string[]> = {
  youtube: ["youtube.com", "youtu.be"],
  spotify: ["open.spotify.com"],
  soundcloud: ["soundcloud.com"],
  bandcamp: ["bandcamp.com"],
};

function hostMatches(hostname: string, allowed: string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, "");
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export function validateMediaUrl(provider: MediaProvider, value: string): string | null {
  if (!value.trim()) return null;
  let parsed: URL;
  try {
    parsed = new URL(value.trim());
  } catch {
    return "Enter a complete HTTPS link.";
  }
  if (parsed.protocol !== "https:") return "Use an HTTPS link.";
  if (!hostMatches(parsed.hostname, HOSTS[provider])) return `This is not a ${provider} link.`;
  return null;
}

function youtubeVideoId(parsed: URL): string | null {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  let candidate: string | null = null;
  if (host === "youtu.be") candidate = parsed.pathname.split("/").filter(Boolean)[0] ?? null;
  if (host === "youtube.com" || host.endsWith(".youtube.com")) {
    candidate = parsed.searchParams.get("v");
    if (!candidate) {
      const parts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0])) candidate = parts[1] ?? null;
    }
  }
  return candidate && /^[A-Za-z0-9_-]{11}$/.test(candidate) ? candidate : null;
}

function spotifyEmbed(parsed: URL): string | null {
  if (!hostMatches(parsed.hostname, HOSTS.spotify)) return null;
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parts[0]?.startsWith("intl-")) parts.shift();
  const [type, id] = parts;
  if (!type || !id || !["artist", "track", "album", "playlist", "show", "episode"].includes(type)) return null;
  if (!/^[A-Za-z0-9]+$/.test(id)) return null;
  return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
}

export function toMediaItem(link: SocialLink): ArtistMediaItem | null {
  if (!["youtube", "spotify", "soundcloud", "bandcamp"].includes(link.platform)) return null;
  const provider = link.platform as MediaProvider;
  let parsed: URL;
  try {
    parsed = new URL(link.url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" || !hostMatches(parsed.hostname, HOSTS[provider])) return null;

  if (provider === "youtube") {
    const videoId = youtubeVideoId(parsed);
    return {
      provider,
      url: link.url,
      videoId: videoId ?? undefined,
      embedUrl: videoId
        ? `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1`
        : undefined,
    };
  }
  if (provider === "spotify") {
    return { provider, url: link.url, embedUrl: spotifyEmbed(parsed) ?? undefined };
  }
  if (provider === "soundcloud") {
    const hasContentPath = parsed.pathname.split("/").filter(Boolean).length >= 2;
    return {
      provider,
      url: link.url,
      embedUrl: hasContentPath
        ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(link.url)}&color=%23ff7a1a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&visual=false`
        : undefined,
    };
  }

  const isOfficialEmbed = parsed.hostname.toLowerCase().replace(/^www\./, "") === "bandcamp.com" &&
    parsed.pathname.toLowerCase().startsWith("/embeddedplayer/");
  return { provider, url: link.url, embedUrl: isOfficialEmbed ? link.url : undefined };
}

export function artistMedia(socials?: SocialLink[]): ArtistMediaItem[] {
  const seen = new Set<MediaProvider>();
  const media: ArtistMediaItem[] = [];
  for (const link of socials ?? []) {
    const item = toMediaItem(link);
    if (!item || seen.has(item.provider)) continue;
    seen.add(item.provider);
    media.push(item);
  }
  return media;
}
