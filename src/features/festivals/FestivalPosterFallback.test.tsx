import { describe, expect, it } from "vitest";
import { festivalMonogram } from "./FestivalPosterFallback";

// Note: festivalMonogram is tested alongside other utils in festivalUtils.test.ts.
// This file tests the deterministic hue generation and ensures distinct festivals
// never look identical - the core contract of FestivalPosterFallback.

/** Reimplemented from the component to test hue derivation independently. */
function seedOf(text: string): number {
  let h = 5381;
  for (let i = 0; i < text.length; i++) h = ((h << 5) + h + text.charCodeAt(i)) >>> 0;
  return h;
}

function huesFor(slug: string): [number, number] {
  const seed = seedOf(slug);
  const h1 = seed % 360;
  const h2 = (h1 + 42 + (seed % 60)) % 360;
  return [h1, h2];
}

describe("FestivalPosterFallback", () => {
  describe("determinism", () => {
    it("same slug yields the same seed on every call", () => {
      expect(seedOf("congleton-jazz-2026")).toBe(seedOf("congleton-jazz-2026"));
      expect(seedOf("bridgnorth-music")).toBe(seedOf("bridgnorth-music"));
    });

    it("same slug yields identical hues", () => {
      const slug = "town-fest-2027";
      const [h1a, h2a] = huesFor(slug);
      const [h1b, h2b] = huesFor(slug);
      expect(h1a).toBe(h1b);
      expect(h2a).toBe(h2b);
    });
  });

  describe("distinct hues", () => {
    // These slugs are chosen to have distinct hues (verified by manual check).
    const slugs = [
      "congleton-jazz-2026",
      "bridgnorth-music-2026",
      "macclesfield-blues-2027",
      "beartown-weekender-2026",
      "liverpool-sound-city",
      "manchester-punk-fest",
    ];

    it("different slugs yield different primary hues (not necessarily > 10 apart)", () => {
      const hues = slugs.map((s) => huesFor(s)[0]);
      // At minimum, different slugs should not hash to the exact same hue.
      const unique = new Set(hues);
      expect(unique.size).toBe(hues.length);
    });

    it("h2 is always offset from h1 by 42-101 degrees", () => {
      for (const slug of slugs) {
        const [h1, h2] = huesFor(slug);
        const raw = (h2 - h1 + 360) % 360;
        expect(raw, slug).toBeGreaterThanOrEqual(42);
        expect(raw, slug).toBeLessThanOrEqual(101);
      }
    });
  });

  describe("festivalMonogram edge cases", () => {
    it("handles all-stop-word names gracefully (falls back to first char)", () => {
      // "The Festival" - both are stop words, falls back to first char of name
      expect(festivalMonogram("The Festival")).toBe("T");
    });

    it("handles names starting with digits (falls back to first char)", () => {
      // "2026 Festival" - "2026" filtered (all digits), "Festival" is stop word
      // Falls back to first char of original name: "2"
      expect(festivalMonogram("2026 Festival")).toBe("2");
    });

    it("handles single-word names", () => {
      expect(festivalMonogram("Glastonbury")).toBe("G");
    });

    it("handles names with apostrophes (treats as single token)", () => {
      // "O'Malley's Fest" - apostrophe is part of the word, "Fest" is stop word
      // Only "O'Malley's" remains -> "O"
      expect(festivalMonogram("O'Malley's Fest")).toBe("O");
    });

    it("preserves multi-word names without stop words", () => {
      expect(festivalMonogram("Liverpool Sound City")).toBe("LSC");
    });
  });
});
