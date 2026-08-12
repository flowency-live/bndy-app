"use client";

// Session context for bndy-app. Reads /api/me once, refreshes every 15 minutes.
// Role ladder: user | curator | owner | staff.

import { createContext, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { checkAuth, signOut as apiSignOut, type AuthSession, type AuthUser, type UserRole } from "./authApi";

interface AuthContextValue {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  profileCompleted: boolean;
  isCurator: boolean;
  isStaff: boolean;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<AuthSession | null>({
    queryKey: ["auth", "me"],
    queryFn: checkAuth,
    staleTime: 5 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
    retry: false,
  });

  const user = data?.user ?? null;
  const role = user?.role ?? null;

  const refresh = async () => {
    await qc.invalidateQueries({ queryKey: ["auth", "me"] });
  };

  const signOut = async () => {
    await apiSignOut();
    qc.setQueryData(["auth", "me"], null);
    qc.removeQueries({ queryKey: ["favourites"] }); // A7 fix: clear favourites on sign-out
  };

  const value: AuthContextValue = {
    user,
    role,
    isAuthenticated: !!user,
    isLoading,
    profileCompleted: user?.profileCompleted ?? true,
    isCurator: role === "curator" || role === "staff",
    isStaff: role === "staff",
    refresh,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
