// Save a gig to my calendar (backlog item 3a). Pure functions, no login,
// no backend: a .ics blob covers Apple/Outlook/everything, a template link
// covers Google. Times are UK-local with an explicit Europe/London TZID.

import type { Gig } from "./types";

const TZ = "Europe/London";

/** RFC 5545 text escaping: backslash, semicolon, comma, newline. */
function esc(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

function compact(date: string, time?: string): string {
  const d = date.replace(/-/g, "");
  return time ? `${d}T${time.replace(":", "")}00` : d;
}

/** endTime, or start + 3 hours (rolling the date when it crosses midnight). */
function resolveEnd(gig: Gig): { date: string; time: string } | null {
  if (!gig.startTime) return null;
  if (gig.endTime) return { date: gig.date, time: gig.endTime };
  const [h, m] = gig.startTime.split(":").map(Number);
  const endH = h + 3;
  if (endH < 24) return { date: gig.date, time: `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
  // roll into the next day
  const d = new Date(`${gig.date}T00:00:00`);
  d.setDate(d.getDate() + 1);
  const nd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return { date: nd, time: `${String(endH - 24).padStart(2, "0")}:${String(m).padStart(2, "0")}` };
}

function summaryOf(gig: Gig): string {
  return `${gig.artistName || gig.title} at ${gig.venueName}`;
}

function locationOf(gig: Gig): string {
  return gig.venueCity ? `${gig.venueName}, ${gig.venueCity}` : gig.venueName;
}

function descriptionOf(gig: Gig): string {
  const path = gig.artistId ? `/artists/${gig.artistId}` : `/venues/${gig.venueId}`;
  const origin = typeof window !== "undefined" ? window.location.origin : "https://bndy.co.uk";
  return `Found on bndy — keeping live music alive. ${origin}${path}`;
}

export function buildIcs(gig: Gig): string {
  const end = resolveEnd(gig);
  const dtstart = gig.startTime
    ? `DTSTART;TZID=${TZ}:${compact(gig.date, gig.startTime)}`
    : `DTSTART;VALUE=DATE:${compact(gig.date)}`;

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//bndy//gig//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:gig-${gig.id}@bndy.co.uk`,
    dtstart,
    ...(end ? [`DTEND;TZID=${TZ}:${compact(end.date, end.time)}`] : []),
    `SUMMARY:${esc(summaryOf(gig))}`,
    `LOCATION:${esc(locationOf(gig))}`,
    `DESCRIPTION:${esc(descriptionOf(gig))}`,
    `GEO:${gig.location.lat};${gig.location.lng}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n");
}

export function googleCalendarUrl(gig: Gig): string {
  const end = resolveEnd(gig);
  const dates = gig.startTime && end
    ? `${compact(gig.date, gig.startTime)}/${compact(end.date, end.time)}`
    : `${compact(gig.date)}/${compact(gig.date)}`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: summaryOf(gig),
    dates,
    ctz: TZ,
    location: locationOf(gig),
    details: descriptionOf(gig),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function icsFilename(gig: Gig): string {
  const slug = (gig.artistName || gig.title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${slug}-${gig.date}.ics`;
}

/** Trigger the .ics download in the browser. */
export function downloadIcs(gig: Gig): void {
  const blob = new Blob([buildIcs(gig)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = icsFilename(gig);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
