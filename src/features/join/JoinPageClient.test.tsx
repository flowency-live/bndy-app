import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JoinPageClient } from "./JoinPageClient";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ isAuthenticated: true }) }));
vi.mock("./joinAnalytics", () => ({ trackJoin: vi.fn() }));

describe("JoinPageClient", () => {
  it("uses Add and Find language for an authenticated multi-entity account", () => {
    render(<JoinPageClient />);

    expect(screen.getByRole("heading", { name: "Find an artist or venue." })).not.toBeNull();
    expect(screen.getByText(/Add another artist or venue to your account/)).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Find or add an artist" })).not.toBeNull();
    expect(screen.getByRole("heading", { name: "Find or add a venue" })).not.toBeNull();
    expect(screen.queryByText(/Join bndy/)).toBeNull();
  });

  it("falls back to Manage when there is no safe same-origin history entry", () => {
    render(<JoinPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mocks.push).toHaveBeenCalledWith("/manage");
  });
});
