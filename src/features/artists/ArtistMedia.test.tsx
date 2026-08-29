import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtistMedia } from "./ArtistMedia";

describe("ArtistMedia", () => {
  it("loads a safe player only after the visitor taps", () => {
    const { container } = render(<ArtistMedia artistName="Test Band" socials={[
      { platform: "youtube", url: "https://youtu.be/abcdefghijk" }
    ]} />);

    expect(container.querySelector("iframe")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /load video for test band/i }));
    const frame = container.querySelector("iframe");
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute("src")).toContain("youtube-nocookie.com/embed/abcdefghijk");
    expect(frame?.getAttribute("src")).not.toContain("autoplay=1");
  });

  it("keeps a normal Bandcamp link as a polished outbound card", () => {
    render(<ArtistMedia artistName="Test Band" socials={[
      { platform: "bandcamp", url: "https://testband.bandcamp.com/album/live" }
    ]} />);

    expect(screen.getByRole("link", { name: /open bandcamp/i }).getAttribute("href")).toBe("https://testband.bandcamp.com/album/live");
    expect(screen.queryByRole("button", { name: /load/i })).toBeNull();
  });
});
