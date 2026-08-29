import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { ArtistAvailability } from "./ArtistAvailability";
import type { Artist, AvailabilityDate, AvailabilityDateStatus } from "@/domain/types";

const artist: Artist = {
  id: "artist-1",
  name: "Test Band",
  publishAvailability: true,
  availabilityMode: "free_weekends",
  contactMethod: "whatsapp",
  phoneNumber: "+441234567890",
  whatsappNumber: "+447700900000",
  availabilityMessage: "If you cannot see the date you need, please get in contact anyway.",
};

const dates: AvailabilityDate[] = Array.from({ length: 10 }, (_, index) => ({
  id: `date-${index}`,
  artistId: "artist-1",
  date: `2026-09-${String(index + 4).padStart(2, "0")}`,
  type: "free_weekend",
}));

const statuses: AvailabilityDateStatus[] = [
  { date: "2026-09-20", state: "public_gig", eventId: "gig-1" },
  { date: "2026-09-21", state: "private_booking" },
];

describe("ArtistAvailability", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"));
  });

  afterAll(() => vi.useRealTimers());

  it("shows only public gigs and private bookings while preserving contact behaviour", () => {
    render(<ArtistAvailability artist={artist} availability={dates} dateStatuses={statuses} />);

    expect(screen.getByText(/if you cannot see the date you need/i)).not.toBeNull();
    expect(screen.queryByRole("link", { name: /whatsapp/i })).toBeNull();
    for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(weekday)).not.toBeNull();
    }
    expect(screen.getByRole("link", { name: /sunday, 20 september 2026, public gig/i }).getAttribute("href")).toBe("/gigs/gig-1");
    expect(screen.getByLabelText(/monday, 21 september 2026, private booking/i)).not.toBeNull();
    expect(screen.getByText("Available")).not.toBeNull();
    expect(screen.getByText("Public gig")).not.toBeNull();
    expect(screen.getByText("Private booking")).not.toBeNull();
    expect(screen.getByText("Unlisted dates may still be possible")).not.toBeNull();
    expect(screen.queryByText("Booked / unavailable")).toBeNull();
    expect(screen.queryByText("Member unavailable")).toBeNull();
    expect(screen.queryByText("Artist unavailable")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /friday, 4 september 2026, available/i }));
    const whatsapp = screen.getByRole("link", { name: /ask on whatsapp/i });
    expect(whatsapp.getAttribute("href")).toContain("https://wa.me/447700900000?text=");
    expect(decodeURIComponent(whatsapp.getAttribute("href") || "")).toContain("Friday, 4 September 2026");
    expect(screen.getByRole("link", { name: "Call" }).getAttribute("href")).toBe("tel:+441234567890");
  });

  it("lets an unlisted future date become the enquiry date", () => {
    render(<ArtistAvailability artist={artist} availability={dates} />);
    fireEvent.click(screen.getByRole("button", { name: /monday, 14 september 2026, availability not listed/i }));
    expect(screen.getByText("Monday, 14 September 2026")).not.toBeNull();
    expect(decodeURIComponent(screen.getByRole("link", { name: /ask on whatsapp/i }).getAttribute("href") || "")).toContain("Monday, 14 September 2026");
  });

  it("moves through the year in three-month windows", () => {
    render(<ArtistAvailability artist={artist} availability={dates} />);

    expect(screen.getByRole("tab", { name: /aug 2026/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /oct 2026/i })).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Next 3 months" }));
    expect(screen.getByRole("tab", { name: /nov 2026/i })).not.toBeNull();
    expect(screen.getByRole("tab", { name: /jan 2027/i })).not.toBeNull();
  });

  it("renders nothing when there are no public dates", () => {
    const { container } = render(<ArtistAvailability artist={{ ...artist, whatsappNumber: null }} availability={[]} />);
    expect(container.childElementCount).toBe(0);
  });
});
