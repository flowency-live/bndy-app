import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { JoinPageClient } from "./JoinPageClient";

const mocks = vi.hoisted(() => ({ push: vi.fn(), isAuthenticated: true }));

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));
vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ isAuthenticated: mocks.isAuthenticated }) }));
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

  it("explains that management uses a normal bndy account after entity search", () => {
    mocks.isAuthenticated = false;
    render(<JoinPageClient />);

    expect(screen.getByText(/Search for your artist or venue page first/)).not.toBeNull();
    expect(screen.getByText(/normal bndy account/)).not.toBeNull();
    mocks.isAuthenticated = true;
  });

  it("falls back to Manage when there is no safe same-origin history entry", () => {
    render(<JoinPageClient />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(mocks.push).toHaveBeenCalledWith("/manage");
  });
});
