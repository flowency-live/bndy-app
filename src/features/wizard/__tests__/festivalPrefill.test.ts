import { describe, expect, it } from "vitest";

// Festival prefill logic tests.
// The wizard accepts ?festivalId=&festivalName=&festivalSlug= from the festival
// manage page. These params:
//   - Link the created gig to the festival (festivalId + festivalName on submit)
//   - Show "For {festivalName}" header during creation
//   - Show "Back to {festivalName}" link on success
//
// This file tests the parameter extraction and payload construction logic
// without rendering the full WizardShell component.

interface FestivalPrefillParams {
  festivalId: string | null;
  festivalName: string | null;
  festivalSlug: string | null;
}

interface CreatePayload {
  festivalId?: string;
  festivalName?: string;
}

/** Extracts festival params from URL search params (mirrors WizardShell). */
function extractFestivalParams(searchParams: URLSearchParams): FestivalPrefillParams {
  return {
    festivalId: searchParams.get("festivalId"),
    festivalName: searchParams.get("festivalName"),
    festivalSlug: searchParams.get("festivalSlug"),
  };
}

/** Builds the festival fields for createCommunityEvent (mirrors WizardShell). */
function buildFestivalPayload(params: FestivalPrefillParams): CreatePayload {
  return {
    festivalId: params.festivalId || undefined,
    // festivalName is only included when festivalId is present
    festivalName: (params.festivalId && params.festivalName) || undefined,
  };
}

describe("festival prefill params", () => {
  describe("extractFestivalParams", () => {
    it("extracts all three params when present", () => {
      const params = new URLSearchParams(
        "festivalId=f1&festivalName=Jazz%20Fest&festivalSlug=jazz-fest-2026",
      );
      const result = extractFestivalParams(params);

      expect(result.festivalId).toBe("f1");
      expect(result.festivalName).toBe("Jazz Fest");
      expect(result.festivalSlug).toBe("jazz-fest-2026");
    });

    it("returns null for missing params", () => {
      const params = new URLSearchParams("");
      const result = extractFestivalParams(params);

      expect(result.festivalId).toBeNull();
      expect(result.festivalName).toBeNull();
      expect(result.festivalSlug).toBeNull();
    });

    it("handles partial params", () => {
      const params = new URLSearchParams("festivalId=f1");
      const result = extractFestivalParams(params);

      expect(result.festivalId).toBe("f1");
      expect(result.festivalName).toBeNull();
      expect(result.festivalSlug).toBeNull();
    });
  });

  describe("buildFestivalPayload", () => {
    it("includes both fields when festivalId and festivalName are present", () => {
      const payload = buildFestivalPayload({
        festivalId: "f1",
        festivalName: "Jazz Fest",
        festivalSlug: "jazz-fest",
      });

      expect(payload.festivalId).toBe("f1");
      expect(payload.festivalName).toBe("Jazz Fest");
    });

    it("excludes festivalName when festivalId is missing", () => {
      // Edge case: festivalName without festivalId should not be sent
      const payload = buildFestivalPayload({
        festivalId: null,
        festivalName: "Jazz Fest",
        festivalSlug: "jazz-fest",
      });

      expect(payload.festivalId).toBeUndefined();
      expect(payload.festivalName).toBeUndefined();
    });

    it("excludes both fields when neither is present", () => {
      const payload = buildFestivalPayload({
        festivalId: null,
        festivalName: null,
        festivalSlug: null,
      });

      expect(payload.festivalId).toBeUndefined();
      expect(payload.festivalName).toBeUndefined();
    });

    it("includes festivalId alone when festivalName is missing", () => {
      // The server accepts festivalId without festivalName
      const payload = buildFestivalPayload({
        festivalId: "f1",
        festivalName: null,
        festivalSlug: null,
      });

      expect(payload.festivalId).toBe("f1");
      expect(payload.festivalName).toBeUndefined();
    });
  });

  describe("back link logic", () => {
    it("festivalSlug presence determines back link visibility", () => {
      // This mirrors the JSX: {festivalSlug && <Link href={`/festivals/${festivalSlug}/manage`} .../>}
      const withSlug = { festivalId: "f1", festivalName: "Jazz Fest", festivalSlug: "jazz-fest" };
      const withoutSlug = { festivalId: "f1", festivalName: "Jazz Fest", festivalSlug: null };

      expect(!!withSlug.festivalSlug).toBe(true);
      expect(!!withoutSlug.festivalSlug).toBe(false);
    });

    it("back link uses festivalName for display text", () => {
      const params = { festivalId: "f1", festivalName: "Blues Weekend", festivalSlug: "blues-2026" };
      const displayText = params.festivalName || "the festival";

      expect(displayText).toBe("Blues Weekend");
    });

    it("falls back to 'the festival' when festivalName is missing", () => {
      const params = { festivalId: "f1", festivalName: null, festivalSlug: "blues-2026" };
      const displayText = params.festivalName || "the festival";

      expect(displayText).toBe("the festival");
    });
  });

  describe("header display logic", () => {
    it("shows festivalName in header when present", () => {
      // This mirrors: {festivalName && <div>For {festivalName}</div>}
      const params = { festivalId: "f1", festivalName: "Jazz Fest", festivalSlug: "jazz-fest" };
      const showHeader = !!params.festivalName;

      expect(showHeader).toBe(true);
    });

    it("hides festival header when festivalName is missing", () => {
      const params = { festivalId: "f1", festivalName: null, festivalSlug: "jazz-fest" };
      const showHeader = !!params.festivalName;

      expect(showHeader).toBe(false);
    });
  });
});
