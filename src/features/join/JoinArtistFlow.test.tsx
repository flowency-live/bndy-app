import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { JoinArtistFlow } from "./JoinArtistFlow";

const mocks = vi.hoisted(() => ({
  placesSuggest: vi.fn(),
  resolveArtist: vi.fn(),
  searchArtistAutocomplete: vi.fn(),
  joinArtist: vi.fn(),
  saveJoinState: vi.fn(),
}));

vi.mock("@/lib/artistTaxonomy", () => ({
  useArtistTaxonomy: () => ({ data: { artistTypes: [{ value: "band", label: "Band" }], actTypes: [], genres: [] } }),
}));

vi.mock("@/features/auth/AuthGate", () => ({ AuthGate: ({ children }: { children: ReactNode }) => children }));

vi.mock("@/features/wizard/wizardApi", () => ({
  placesSuggest: mocks.placesSuggest,
  resolveArtist: mocks.resolveArtist,
}));

vi.mock("./artistSearchApi", () => ({ searchArtistAutocomplete: mocks.searchArtistAutocomplete }));
vi.mock("./joinApi", () => ({ joinArtist: mocks.joinArtist }));
vi.mock("./joinAnalytics", () => ({ trackJoin: vi.fn() }));
vi.mock("./joinState", () => ({
  clearJoinState: vi.fn(),
  readJoinState: vi.fn(() => null),
  saveJoinState: mocks.saveJoinState,
}));

describe("JoinArtistFlow same-name identity decision", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.searchArtistAutocomplete.mockResolvedValue([
      { id: "torrists-north-west", name: "The Torrists", location: "North West England" },
    ]);
    mocks.placesSuggest.mockResolvedValue([
      { placeId: "stoke", name: "Stoke-on-Trent", address: "UK" },
    ]);
    mocks.joinArtist.mockResolvedValue({
      ok: true,
      artist: { id: "torrists-stoke", name: "The Torrists", location: "Stoke-on-Trent" },
      relationship: { id: "membership-1", role: "owner", status: "active" },
    });
    mocks.resolveArtist
      .mockResolvedValueOnce({
        action: "matched",
        candidates: [{ id: "torrists-north-west", name: "The Torrists", location: "North West England" }],
      })
      .mockResolvedValueOnce({ action: "clear", candidates: [] });
  });

  it("requires an explicit distinct-artist confirmation and carries confirmNew into the journey", async () => {
    render(<JoinArtistFlow />);

    fireEvent.change(screen.getByLabelText("Artist or band name"), { target: { value: "The Torrists" } });
    await screen.findByText("North West England");

    fireEvent.click(screen.getByRole("button", { name: /Add a new The Torrists in another location/i }));
    fireEvent.change(screen.getByLabelText("Town, city or area"), { target: { value: "stoke" } });
    fireEvent.click(await screen.findByRole("button", { name: /Stoke-on-Trent UK/i }));

    fireEvent.click(screen.getByRole("button", { name: "Continue with this location" }));
    const distinct = await screen.findByRole("button", { name: "Different artist in Stoke-on-Trent" });
    expect(screen.queryByRole("button", { name: "Continue with this location" })).toBeNull();

    fireEvent.click(distinct);
    await screen.findByText("Nice. Let's make it yours.");

    expect(mocks.resolveArtist).toHaveBeenNthCalledWith(
      2,
      { name: "The Torrists", location: "Stoke-on-Trent" },
      { dryRun: true, confirmNew: true },
    );
    expect(mocks.saveJoinState).toHaveBeenLastCalledWith(expect.objectContaining({
      entityType: "artist",
      intent: "new",
      location: "Stoke-on-Trent",
      confirmNew: true,
    }));

    fireEvent.click(screen.getByRole("button", { name: "Band" }));
    fireEvent.click(screen.getByRole("button", { name: "Add this artist" }));
    await waitFor(() => expect(mocks.joinArtist).toHaveBeenCalledWith(expect.objectContaining({
      name: "The Torrists",
      location: "Stoke-on-Trent",
      confirmNew: true,
    })));
  });

  it("uses an opaque theme surface for location suggestions", async () => {
    render(<JoinArtistFlow />);

    fireEvent.change(screen.getByLabelText("Artist or band name"), { target: { value: "The Torrists" } });
    await screen.findByText("North West England");
    fireEvent.click(screen.getByRole("button", { name: /Add a new The Torrists in another location/i }));
    fireEvent.change(screen.getByLabelText("Town, city or area"), { target: { value: "stoke" } });

    const suggestion = await screen.findByRole("button", { name: /Stoke-on-Trent UK/i });
    expect(suggestion.parentElement?.className).toContain("bg-card");
    expect(suggestion.parentElement?.className).not.toContain("var(--bg)");
    await waitFor(() => expect(mocks.placesSuggest).toHaveBeenCalledWith("stoke", "town"));
  });
});
