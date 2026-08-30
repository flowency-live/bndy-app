import { afterEach, describe, expect, it, vi } from "vitest";
import { joinArtist, requestJoinClaim } from "./joinApi";

describe("joinArtist", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("carries the explicit same-name confirmation into authenticated creation", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 201,
      json: vi.fn().mockResolvedValue({
        artist: { id: "torrists-stoke", name: "The Torrists", location: "Stoke-on-Trent" },
        relationship: { id: "membership-1", role: "owner", status: "active" },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await joinArtist({ name: "The Torrists", location: "Stoke-on-Trent", confirmNew: true });

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      name: "The Torrists",
      location: "Stoke-on-Trent",
      confirmNew: true,
    }));
  });

  it("sends the signed Facebook receipt without a client-authored Page assertion", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ claim: { claim_id: "claim-1" } }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await requestJoinClaim({
      entityType: "artist",
      entityId: "artist-1",
      verificationMethod: "facebook_page",
      facebookVerificationReceipt: "signed-receipt",
      facebookEvidence: { verifiedPageId: "123456789" },
    });

    const [, request] = fetchMock.mock.calls[0];
    expect(JSON.parse(request.body)).toEqual(expect.objectContaining({
      facebookVerificationReceipt: "signed-receipt",
      facebookEvidence: { verifiedPageId: "123456789" },
    }));
  });
});
