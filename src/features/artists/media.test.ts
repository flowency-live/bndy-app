import { describe, expect, it } from "vitest";
import { artistMedia, toMediaItem, validateMediaUrl } from "./media";

describe("artist media", () => {
  it("builds a privacy-enhanced YouTube embed from common video URLs", () => {
    const item = toMediaItem({ platform: "youtube", url: "https://youtu.be/abcdefghijk" });
    expect(item).toMatchObject({
      provider: "youtube",
      videoId: "abcdefghijk",
      embedUrl: "https://www.youtube-nocookie.com/embed/abcdefghijk?rel=0&modestbranding=1",
    });
  });

  it("builds Spotify and SoundCloud embeds only from approved hosts", () => {
    expect(toMediaItem({ platform: "spotify", url: "https://open.spotify.com/artist/abc123" })?.embedUrl)
      .toContain("/embed/artist/abc123");
    expect(toMediaItem({ platform: "soundcloud", url: "https://soundcloud.com/example/live-set" })?.embedUrl)
      .toContain("w.soundcloud.com/player/");
    expect(toMediaItem({ platform: "spotify", url: "https://open.spotify.com.example.org/artist/abc123" }))
      .toBeNull();
  });

  it("accepts YouTube channels without treating them as embeddable videos", () => {
    expect(validateMediaUrl("youtube", "https://www.youtube.com/@example")).toBeNull();
    expect(toMediaItem({ platform: "youtube", url: "https://www.youtube.com/@example" })?.embedUrl).toBeUndefined();
    expect(validateMediaUrl("youtube", "https://www.youtube.com/shorts/abcdefghijk")).toBeNull();
  });

  it("renders only one item per provider", () => {
    expect(artistMedia([
      { platform: "spotify", url: "https://open.spotify.com/artist/first" },
      { platform: "spotify", url: "https://open.spotify.com/track/second" },
      { platform: "bandcamp", url: "https://example.bandcamp.com/album/live" },
    ])).toHaveLength(2);
  });
});
