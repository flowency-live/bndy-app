"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoginPanel } from "@/features/auth/LoginPanel";
import { useAuth } from "@/lib/auth/AuthProvider";

const ERRORS: Record<string, string> = {
  token_expired: "That sign-in link expired. Request a new one.",
  invalid_token: "That sign-in link is not valid. Request a new one.",
  invalid_state: "Sign-in failed. Try again.",
  no_code: "Sign-in failed. Try again.",
  token_exchange_failed: "Sign-in failed. Try again.",
  authentication_failed: "Sign-in failed. Try again.",
};

export function LoginClient() {
  const params = useSearchParams();
  const router = useRouter();
  const { isAuthenticated } = useAuth();

  const next = params.get("next") || "/";
  const errorKey = params.get("error");
  const error = errorKey ? (ERRORS[errorKey] ?? "Sign-in failed. Try again.") : null;

  // Already signed in — go where the user was headed.
  useEffect(() => {
    if (isAuthenticated) router.replace(next);
  }, [isAuthenticated, next, router]);

  return (
    <div className="px-4 py-8">
      {error && (
        <p className="mx-auto mb-4 w-full max-w-sm rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-[13px] font-semibold text-red-400">
          {error}
        </p>
      )}
      <LoginPanel nextPath={next} />
    </div>
  );
}
