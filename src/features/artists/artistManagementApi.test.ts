import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getManagedArtistAvailability,
  getMyArtistManagementRelationships,
  getPublicArtistAvailability,
  toggleArtistAvailability,
  updateOwnedArtistProfile,
} from "./artistManagementApi";

afterEach(() => vi.unstubAllGlobals());

describe("artistManagementApi", () => {
  it("uses the narrow owned-profile mutation with the session cookie", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ id: "artist-1", name: "Band", youtubeUrl: "https://youtu.be/abcdefghijk" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const updated = await updateOwnedArtistProfile("artist-1", { youtubeUrl: "https://youtu.be/abcdefghijk" });

    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/api/artists/artist-1/profile"), expect.objectContaining({
      method: "PATCH",
      credentials: "include",
      body: JSON.stringify({ youtubeUrl: "https://youtu.be/abcdefghijk" }),
    }));
    expect(updated.socials).toContainEqual({ platform: "youtube", url: "https://youtu.be/abcdefghijk" });
  });

  it("refreshes public dates without browser caching after publishing", async () => {
    const availability = [{ id: "free-1", artistId: "artist-1", date: "2026-09-04", type: "free_weekend" }];
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ availability }) });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getPublicArtistAvailability("artist-1", "2026-09-01", "2026-11-30")).resolves.toEqual(availability);
    expect(fetchMock).toHaveBeenCalledWith(expect.stringContaining("/public-availability?startDate=2026-09-01&endDate=2026-11-30"), expect.objectContaining({
      cache: "no-store",
      credentials: "include",
    }));
  });

  it("uses the existing canonical availability routes", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ availability: [], busyDates: [] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ action: "created" }) });
    vi.stubGlobal("fetch", fetchMock);

    await getManagedArtistAvailability("artist-1", "2026-09-01", "2026-11-30");
    await toggleArtistAvailability("artist-1", "2026-09-05");

    expect(fetchMock.mock.calls[0][0]).toContain("/api/artists/artist-1/availability?startDate=2026-09-01&endDate=2026-11-30");
    expect(fetchMock.mock.calls[1][0]).toContain("/api/artists/artist-1/events/toggle-availability");
  });

  it("reads relationship authority without depending on claim UI code", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ artists: [{ artist_id: "artist-1", role: "owner", status: "active" }] }),
    }));

    await expect(getMyArtistManagementRelationships()).resolves.toEqual([
      { artistId: "artist-1", role: "owner", status: "active" },
    ]);
  });
});
