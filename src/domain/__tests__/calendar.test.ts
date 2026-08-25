import { describe, expect, it } from "vitest";
import { buildIcs, googleCalendarUrl, icsFilename } from "../calendar";
import type { Gig } from "../types";

const gig: Gig = {
  id: "g1",
  title: "The Torrists live",
  artistId: "a1",
  artistName: "The Torrists",
  venueId: "v1",
  venueName: "The Glebe",
  venueCity: "Stoke-on-Trent",
  date: "2026-09-05",
  startTime: "20:00",
  endTime: "23:00",
  location: { lat: 53, lng: -2.2 },
  ticketed: false,
};

describe("buildIcs", () => {
  it("emits a valid VEVENT with local start and end", () => {
    const ics = buildIcs(gig);
    expect(ics).toContain("BEGIN:VCALENDAR");
    expect(ics).toContain("BEGIN:VEVENT");
    expect(ics).toContain("DTSTART;TZID=Europe/London:20260905T200000");
    expect(ics).toContain("DTEND;TZID=Europe/London:20260905T230000");
    expect(ics).toContain("SUMMARY:The Torrists at The Glebe");
    expect(ics).toContain("LOCATION:The Glebe\\, Stoke-on-Trent");
    expect(ics).toContain("END:VEVENT");
    expect(ics).toContain("END:VCALENDAR");
  });

  it("rolls an explicit past-midnight end to the next day", () => {
    const ics = buildIcs({ ...gig, startTime: "22:00", endTime: "01:00" });
    expect(ics).toContain("DTSTART;TZID=Europe/London:20260905T220000");
    expect(ics).toContain("DTEND;TZID=Europe/London:20260906T010000");
  });

  it("defaults the end to three hours after the start", () => {
    const ics = buildIcs({ ...gig, endTime: undefined });
    expect(ics).toContain("DTEND;TZID=Europe/London:20260905T230000");
  });

  it("crosses midnight when the default end passes 24:00", () => {
    const ics = buildIcs({ ...gig, startTime: "22:30", endTime: undefined });
    expect(ics).toContain("DTSTART;TZID=Europe/London:20260905T223000");
    expect(ics).toContain("DTEND;TZID=Europe/London:20260906T013000");
  });

  it("falls back to an all-day event without a start time", () => {
    const ics = buildIcs({ ...gig, startTime: undefined, endTime: undefined });
    expect(ics).toContain("DTSTART;VALUE=DATE:20260905");
    expect(ics).not.toContain("DTEND;TZID");
  });

  it("escapes commas and semicolons in text fields", () => {
    const ics = buildIcs({ ...gig, artistName: "Sea; Shanty, Crew" });
    expect(ics).toContain("SUMMARY:Sea\\; Shanty\\, Crew at The Glebe");
  });

  it("uses CRLF line endings as the RFC requires", () => {
    expect(buildIcs(gig)).toContain("\r\n");
  });
});

describe("googleCalendarUrl", () => {
  it("builds a template link with local times and the London timezone", () => {
    const url = googleCalendarUrl(gig);
    expect(url).toContain("calendar.google.com/calendar/render?action=TEMPLATE");
    expect(url).toContain("dates=20260905T200000%2F20260905T230000");
    expect(url).toContain("ctz=Europe%2FLondon");
    // URLSearchParams encodes spaces as +  -  Google accepts both forms
    expect(url).toContain("text=The+Torrists+at+The+Glebe");
  });
});

describe("icsFilename", () => {
  it("slugs the artist and date", () => {
    expect(icsFilename(gig)).toBe("the-torrists-2026-09-05.ics");
  });
});
