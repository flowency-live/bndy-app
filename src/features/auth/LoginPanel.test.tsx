import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LoginPanel } from "./LoginPanel";

vi.mock("@/lib/auth/AuthProvider", () => ({ useAuth: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/authApi", () => ({
  appleAuthUrl: () => "/auth/apple",
  facebookAuthUrl: () => "/auth/facebook",
  googleAuthUrl: () => "/auth/google",
  requestMagicLink: vi.fn(),
  requestPhoneOtp: vi.fn(),
  verifyPhoneAndOnboard: vi.fn(),
  verifyPhoneOtp: vi.fn(),
}));

describe("LoginPanel", () => {
  it("leads with social sign-in and explains the personal account value", () => {
    render(<LoginPanel />);

    const methods = within(screen.getByRole("group", { name: "Sign-in method" })).getAllByRole("button");
    expect(methods.map((button) => button.textContent)).toEqual(["Socials", "Phone", "Email"]);
    expect(screen.getByRole("button", { name: "Socials" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("link", { name: "Continue with Google" })).not.toBeNull();
    expect(screen.getByText(/Follow your favourite artists and venues, save filters and make bndy yours/)).not.toBeNull();
  });
});
