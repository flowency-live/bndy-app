import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ClaimEvidenceStep } from "./ClaimEvidenceStep";

vi.mock("./joinApi", () => ({ requestJoinClaim: vi.fn() }));
vi.mock("./joinAnalytics", () => ({ trackJoin: vi.fn() }));

describe("ClaimEvidenceStep", () => {
  it("shows the working manual evidence route without exposing internal Meta status", () => {
    render(<ClaimEvidenceStep entityType="artist" entityId="artist-1" entityName="The Torrists" />);

    expect(screen.getByText("Tell bndy how we can verify you")).not.toBeNull();
    expect(screen.queryByText(/Facebook Page verification/i)).toBeNull();
    expect(screen.queryByText(/Meta Page access/i)).toBeNull();
  });
});
