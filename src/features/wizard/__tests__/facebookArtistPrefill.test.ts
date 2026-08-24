import { describe, expect, it } from "vitest";
import { artistFacebookPrefill } from "../facebookArtistPrefill";
import type { FacebookSourceInspection } from "../wizardApi";

function inspection(overrides: Partial<FacebookSourceInspection> = {}): FacebookSourceInspection {
  return {
    ok: true,
    facebookUrl: "https://www.facebook.com/thecurrantsband",
    facebookKey: "facebook.com/thecurrantsband",
    identityResolved: true,
    observed: {},
    evidence: {},
    warnings: [],
    ...overrides,
  };
}

describe("artistFacebookPrefill", () => {
  it("accepts source-backed Facebook About details", () => {
    const result = artistFacebookPrefill(inspection({
      observed: {
        name: "The Currants",
        location: "Swansea, United Kingdom",
        description: "Welsh indie band.",
        websiteUrl: "https://thecurrants.example/",
        imageUrl: "https://scontent.xx.fbcdn.net/photo.jpg",
      },
      evidence: {
        name: "facebook_about_html",
        location: "facebook_about_html",
        description: "facebook_about_html",
        websiteUrl: "facebook_about_html",
        imageUrl: "facebook_graph_picture",
      },
    }));

    expect(result).toEqual({
      facebookUrl: "https://www.facebook.com/thecurrantsband",
      name: "The Currants",
      verifiedSourceName: true,
      profileImageUrl: "https://scontent.xx.fbcdn.net/photo.jpg",
      location: "Swansea, United Kingdom",
      bio: "Welsh indie band.",
      websiteUrl: "https://thecurrants.example/",
    });
  });

  it("keeps a handle-derived name unverified and ignores unsupported detail evidence", () => {
    const result = artistFacebookPrefill(inspection({
      observed: {
        name: "Thecurrantsband",
        location: "Somewhere",
        description: "Guesswork",
        websiteUrl: "https://guess.example/",
      },
      evidence: {
        name: "facebook_handle_hint",
        location: "facebook_handle_hint",
        description: "facebook_handle_hint",
        websiteUrl: "facebook_handle_hint",
      },
    }));

    expect(result.name).toBe("Thecurrantsband");
    expect(result.verifiedSourceName).toBe(false);
    expect(result.location).toBeUndefined();
    expect(result.bio).toBeUndefined();
    expect(result.websiteUrl).toBeUndefined();
  });
});
