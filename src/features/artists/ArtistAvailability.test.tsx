import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ArtistAvailability } from "./ArtistAvailability";
import type { Artist, AvailabilityDate } from "@/domain/types";

const artist: Artist = {
  id: "artist-1",
  name: "Test Band",
  publishAvailability: true,
  availabilityMode: "free_weekends",
  contactMethod: "whatsapp",
  phoneNumber: "+441234567890",
  whatsappNumber: "+447700900000",
};

const dates: AvailabilityDate[] = Array.from({ length: 10 }, (_, index) => ({
  id: `date-${index}`,
  artistId: "artist-1",
  date: `2026-09-${String(index + 4).padStart(2, "0")}`,
  type: "free_weekend",
}));

describe("ArtistAvailability", () => {
  it("shows the preferred booking action and expands later dates", () => {
    render(<ArtistAvailability artist={artist} availability={dates} />);

    expect(screen.getByRole("link", { name: /whatsapp for bookings/i }).getAttribute("href")).toBe("https://wa.me/447700900000");
    expect(screen.queryByRole("link", { name: /call about a booking/i })).toBeNull();
    expect(screen.getByText("Show all 10 dates")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /show all 10 dates/i }));
    expect(screen.getByText("Show fewer dates")).not.toBeNull();
  });

  it("keeps a clear published empty state", () => {
    render(<ArtistAvailability artist={{ ...artist, whatsappNumber: null }} availability={[]} />);
    expect(screen.getByText("No dates are listed right now.")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /bookings/i })).toBeNull();
  });
});
