export interface GigDiscoveryDateRange {
  start: string;
  end: string;
}

/** Sequential discovery chunks cover today through loadedEnd without gaps.
 * A selected range only needs its own direct request when it extends beyond
 * that already-loaded coverage. */
export function needsDirectDateRangeFetch(
  selection: GigDiscoveryDateRange | null,
  loadedEnd: string,
): boolean {
  return !!selection && selection.end > loadedEnd;
}