import { fireEvent, render, screen } from "@testing-library/react";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
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
  availabilityMessage: "If you cannot see the date you need, please get in contact anyway.",
};

const dates: AvailabilityDate[] = Array.from({ length: 10 }, (_, index) => ({
  id: `date-${index}`,
  artistId: "artist-1",
  date: `2026-09-${String(index + 4).padStart(2, "0")}`,
  type: "free_weekend",
}));

describe("ArtistAvailability", () => {
  beforeAll(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-29T12:00:00.000Z"));
  });

  afterAll(() => vi.useRealTimers());

  it("shows a full calendar, the artist message and preferred booking action", () => {
    render(<ArtistAvailability artist={artist} availability={dates} busyDates={new Set(["2026-09-20"])} />);

    expect(screen.getByText(/if you cannot see the date you need/i)).not.toBeNull();
    expect(screen.getByRole("link", { name: "WhatsApp" }).getAttribute("href")).toBe("https://wa.me/447700900000");
    expect(screen.queryByRole("link", { name: "Call" })).toBeNull();
    for (const weekday of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) {
      expect(screen.getByText(weekday)).not.toBeNull();
    }
    expect(screen.getByLabelText("2026-09-04, available")).not.toBeNull();
    expect(screen.getByLabelText("2026-09-20, booked")).not.toBeNull();
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
