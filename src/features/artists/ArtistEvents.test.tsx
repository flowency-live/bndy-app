import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Gig } from "@/domain/types";
import { ArtistEvents } from "./ArtistEvents";

vi.mock("@/lib/useGeolocation", () => ({
  useGeolocation: () => ({ location: { lat: 53.38, lng: -2.01 }, located: false }),
}));

vi.mock("@/features/gigs/GigSheet", () => ({ GigSheet: () => null }));

vi.mock("./MiniMap", () => ({
  MiniMap: ({ points, pastPoints }: { points: unknown[]; pastPoints: Array<{ count: number }> }) => (
    <div
      data-testid="mini-map"
      data-upcoming-count={points.length}
      data-past-venue-count={pastPoints.length}
      data-past-gig-count={pastPoints.reduce((total, point) => total + point.count, 0)}
    />
  ),
}));

function gig(overrides: Partial<Gig>): Gig {
  return {
    id: "gig-1",
    title: "Gig",
    artistId: "artist-1",
    artistName: "Test Artist",
    venueId: "venue-1",
    venueName: "The Venue",
    venueCity: "New Mills",
    date: "2026-09-01",
    location: { lat: 53.36, lng: -2 },
    ticketed: false,
    ...overrides,
  };
}

describe("ArtistEvents history map", () => {
  it("adds counted past venue points without changing the future event views", () => {
    render(
      <ArtistEvents
        gigs={[gig({ id: "future" })]}
        pastGigs={[
          gig({ id: "past-1", date: "2026-07-01" }),
          gig({ id: "past-2", date: "2026-07-02" }),
        ]}
        artistId="artist-1"
      />
    );

    expect(screen.getByRole("tab", { name: "By date" })).not.toBeNull();
    expect(screen.getByRole("tab", { name: "By distance" })).not.toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Map" }));

    const map = screen.getByTestId("mini-map");
    expect(map.getAttribute("data-upcoming-count")).toBe("1");
    expect(map.getAttribute("data-past-venue-count")).toBe("1");
    expect(map.getAttribute("data-past-gig-count")).toBe("2");
    expect(screen.getByText("Upcoming")).not.toBeNull();
    expect(screen.getByText("Past gigs")).not.toBeNull();
  });

  it("keeps a map available when an artist has history but no future gigs", () => {
    render(<ArtistEvents gigs={[]} pastGigs={[gig({ id: "past", date: "2026-07-01" })]} artistId="artist-1" />);

    expect(screen.getByRole("tab", { name: "Map" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByTestId("mini-map").getAttribute("data-upcoming-count")).toBe("0");
    expect(screen.getByText("Past gigs")).not.toBeNull();
    expect(screen.queryByRole("tab", { name: "By date" })).toBeNull();
  });
});
