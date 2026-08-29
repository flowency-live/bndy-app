import { describe, expect, it } from "vitest";
import {
  availabilityMonths,
  availabilityRangeEnd,
  availabilityWindowLabel,
  availabilityWindowStart,
} from "../availability";

describe("artist availability calendar range", () => {
  it("covers the current calendar month and the following eleven months", () => {
    const months = availabilityMonths("2026-08-29");

    expect(months).toHaveLength(12);
    expect(months[0].key).toBe("2026-08");
    expect(months[11].key).toBe("2027-07");
    expect(availabilityRangeEnd("2026-08-29")).toBe("2027-07-31");
  });

  it("groups a selected month into its three-month window", () => {
    const months = availabilityMonths("2026-08-29");

    expect(availabilityWindowStart(months, "2026-12")).toBe(3);
    expect(availabilityWindowLabel(months.slice(3, 6))).toBe("Nov 2026 to Jan 2027");
  });
});
