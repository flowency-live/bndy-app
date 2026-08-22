import { describe, expect, it } from "vitest";
import { canUseNextImage } from "./nextImage";

describe("Next image host allow-list", () => {
  it("allows local images", () => {
    expect(canUseNextImage("/icons/bndy.png")).toBe(true);
  });

  it("allows configured bndy, AWS and Facebook CDN hosts", () => {
    expect(canUseNextImage("https://images.bndy.co.uk/poster.jpg")).toBe(true);
    expect(canUseNextImage("https://bndy.co.uk/poster.jpg")).toBe(true);
    expect(canUseNextImage("https://bucket.s3.eu-west-2.amazonaws.com/avatar.jpg")).toBe(true);
    expect(canUseNextImage("https://scontent-lhr8-1.xx.fbcdn.net/avatar.jpg")).toBe(true);
  });

  it("keeps arbitrary organiser hotlinks outside the optimiser", () => {
    expect(canUseNextImage("https://example-festival.org/poster.jpg")).toBe(false);
    expect(canUseNextImage("http://images.bndy.co.uk/poster.jpg")).toBe(false);
    expect(canUseNextImage("not a url")).toBe(false);
  });
});
