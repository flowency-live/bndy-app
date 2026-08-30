import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaimEvidenceStep } from "./ClaimEvidenceStep";
import { facebookPageVerificationStatus, requestJoinClaim } from "./joinApi";

vi.mock("./joinApi", () => ({
  facebookPageVerificationStartUrl: vi.fn(() => "/api/claims/facebook/start"),
  facebookPageVerificationStatus: vi.fn(),
  requestJoinClaim: vi.fn(),
}));
vi.mock("./joinAnalytics", () => ({ trackJoin: vi.fn() }));

describe("ClaimEvidenceStep", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(facebookPageVerificationStatus).mockResolvedValue(false);
  });

  it("shows the working manual evidence route without exposing unavailable Meta status", async () => {
    render(<ClaimEvidenceStep entityType="artist" entityId="artist-1" entityName="The Torrists" />);

    expect(screen.getByText("Tell bndy how we can verify you")).not.toBeNull();
    expect(screen.queryByText(/Facebook Page verification/i)).toBeNull();
    expect(screen.queryByText(/Meta Page access/i)).toBeNull();
    await waitFor(() => expect(facebookPageVerificationStatus).toHaveBeenCalled());
  });

  it("submits only the server-signed Page receipt and selected Page id", async () => {
    vi.mocked(facebookPageVerificationStatus).mockResolvedValue(true);
    vi.mocked(requestJoinClaim).mockResolvedValue({ ok: true });
    render(<ClaimEvidenceStep entityType="artist" entityId="artist-1" entityName="The Torrists" />);

    await screen.findByRole("button", { name: "Facebook Page" });
    fireEvent.click(screen.getByRole("button", { name: "Facebook Page" }));
    act(() => {
      window.dispatchEvent(new MessageEvent("message", {
        origin: window.location.origin,
        data: {
          type: "bndy:facebook-page-verification",
          ok: true,
          receipt: "signed-receipt",
          pages: [{ id: "123456789", name: "The Torrists", tasks: ["MANAGE"], pageUrl: "https://www.facebook.com/123456789" }],
        },
      }));
    });

    await screen.findByRole("radio", { name: /The Torrists/ });
    fireEvent.click(screen.getByRole("button", { name: "Send verified Page for review" }));
    await waitFor(() => expect(requestJoinClaim).toHaveBeenCalledWith(expect.objectContaining({
      verificationMethod: "facebook_page",
      facebookVerificationReceipt: "signed-receipt",
      facebookEvidence: { verifiedPageId: "123456789" },
      relationshipExplanation: undefined,
      officialEmail: undefined,
    })));
  });
});
