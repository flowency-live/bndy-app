import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { VenueTicketingBanner } from "../VenueTicketingBanner";
import type { Venue } from "@/domain/types";

function venue(overrides: Partial<Venue> = {}): Venue {
  return {
    id: "venue-1",
    name: "Eleven",
    location: { lat: 53.0, lng: -2.0 },
    ...overrides,
  };
}

describe("VenueTicketingBanner", () => {
  it("does not render for a venue that is not marked standard-ticketed", () => {
    render(<VenueTicketingBanner venue={venue({ standardTicketed: false, standardTicketUrl: "https://tickets.example.com" })} />);
    expect(screen.queryByText("Ticketed venue")).toBeNull();
  });

  it("clearly identifies a ticketed venue even when no ticket URL is available", () => {
    render(<VenueTicketingBanner venue={venue({ standardTicketed: true })} />);

    expect(screen.getByText("Ticketed venue")).toBeDefined();
    expect(screen.getByText("Gigs here normally need a ticket.")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("offers the safe standard ticket page and names its destination", () => {
    render(<VenueTicketingBanner venue={venue({ standardTicketed: true, standardTicketUrl: "https://www.tickets.example.com/eleven" })} />);

    expect(screen.getByText("Tickets via tickets.example.com")).toBeDefined();
    const link = screen.getByRole("link", { name: "Open ticket page at tickets.example.com" });
    expect(link.getAttribute("href")).toBe("https://www.tickets.example.com/eleven");
  });

  it("keeps the ticketed status visible when the stored URL is unsafe", () => {
    render(<VenueTicketingBanner venue={venue({ standardTicketed: true, standardTicketUrl: "javascript:alert(1)" })} />);

    expect(screen.getByText("Ticketed venue")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("shows venue-specific ticket information when supplied", () => {
    render(<VenueTicketingBanner venue={venue({ standardTicketed: true, standardTicketInformation: "Advance tickets only." })} />);
    expect(screen.getByText("Advance tickets only.")).toBeDefined();
  });
});
