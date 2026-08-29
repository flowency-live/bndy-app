import { afterEach, describe, expect, it, vi } from "vitest";
import { joinArtist } from "./joinApi";

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
});
