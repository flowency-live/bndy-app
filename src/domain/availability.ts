export const AVAILABILITY_MONTH_COUNT = 12;
export const AVAILABILITY_WINDOW_SIZE = 3;

export interface AvailabilityCalendarMonth {
  key: string;
  year: number;
  month: number;
  label: string;
  shortLabel: string;
  first: Date;
  last: Date;
  offset: number;
  days: number;
}

function isoUtc(date: Date): string {
  return date.toISOString().split("T")[0];
}

function monthModel(year: number, monthIndex: number): AvailabilityCalendarMonth {
  const first = new Date(Date.UTC(year, monthIndex, 1));
  const last = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0));
  return {
    key: isoUtc(first).slice(0, 7),
    year: first.getUTCFullYear(),
    month: first.getUTCMonth() + 1,
    label: first.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }),
    shortLabel: first.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" }),
    first,
    last,
    offset: (first.getUTCDay() + 6) % 7,
    days: last.getUTCDate(),
  };
}

/** The current calendar month plus the following eleven months. */
export function availabilityMonths(today: string): AvailabilityCalendarMonth[] {
  const [year, month] = today.split("-").map(Number);
  return Array.from({ length: AVAILABILITY_MONTH_COUNT }, (_, offset) => monthModel(year, month - 1 + offset));
}

/** Last day covered by the twelve-month artist availability calendar. */
export function availabilityRangeEnd(today: string): string {
  const months = availabilityMonths(today);
  return isoUtc(months[months.length - 1].last);
}

export function availabilityWindowStart(months: AvailabilityCalendarMonth[], monthKey?: string): number {
  const index = Math.max(0, months.findIndex((month) => month.key === monthKey));
  return Math.floor(index / AVAILABILITY_WINDOW_SIZE) * AVAILABILITY_WINDOW_SIZE;
}

export function availabilityWindowLabel(months: AvailabilityCalendarMonth[]): string {
  if (months.length === 0) return "";
  const first = months[0];
  const last = months[months.length - 1];
  return first.year === last.year
    ? `${first.shortLabel} to ${last.shortLabel} ${last.year}`
    : `${first.shortLabel} ${first.year} to ${last.shortLabel} ${last.year}`;
}
