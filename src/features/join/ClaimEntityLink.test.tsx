import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ClaimEntityLink } from "./ClaimEntityLink";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("ClaimEntityLink", () => {
  beforeEach(() => {
    localStorage.clear();
    mocks.push.mockReset();
  });

  it("preserves the selected artist and opens the Claim journey", () => {
    render(<ClaimEntityLink entityType="artist" entityId="artist-1" entityName="The Torrists" location="Manchester" />);

    fireEvent.click(screen.getByRole("button", { name: "Claim this artist" }));

    expect(mocks.push).toHaveBeenCalledWith("/join/artist");
    expect(JSON.parse(localStorage.getItem("bndy.join.v1") || "{}")).toMatchObject({
      entityType: "artist",
      intent: "claim",
      entityId: "artist-1",
      name: "The Torrists",
      location: "Manchester",
    });
  });
});
