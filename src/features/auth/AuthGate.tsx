"use client";

// Gate: renders children only for a signed-in user with completed profile.
// Signed out, it shows the LoginPanel in place.
// Signed in but profile incomplete, it shows ProfileSetup.

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import { LoginPanel } from "./LoginPanel";
import { ProfileSetup } from "./ProfileSetup";
import type { ReactNode } from "react";

export function AuthGate({ children, title, requireProfile = true }: { children: ReactNode; title?: string; requireProfile?: boolean }) {
  const { isAuthenticated, isLoading, profileCompleted } = useAuth();
  const path = usePathname();
  const [profileJustCompleted, setProfileJustCompleted] = useState(false);

  if (isLoading) {
    return (
      <div className="flex min-h-[40dvh] items-center justify-center">
        <Loader2 size={28} className="animate-spin text-dim" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="px-4 py-8">
        <LoginPanel nextPath={path || "/"} title={title ?? "Sign in to add a gig"} />
      </div>
    );
  }

  // Profile completion gate (skip if just completed to prevent flash)
  if (requireProfile && !profileCompleted && !profileJustCompleted) {
    return (
      <div className="px-4 py-8">
        <ProfileSetup mode="setup" onComplete={() => setProfileJustCompleted(true)} />
      </div>
    );
  }

  return <>{children}</>;
}
