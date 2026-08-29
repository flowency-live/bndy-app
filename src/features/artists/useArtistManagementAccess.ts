"use client";

import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth/AuthProvider";
import { getMyArtistManagementRelationships } from "./artistManagementApi";

export function useArtistManagementAccess(artistId: string) {
  const { isAuthenticated, isCurator } = useAuth();
  const query = useQuery({
    queryKey: ["managed-artists"],
    queryFn: getMyArtistManagementRelationships,
    enabled: isAuthenticated && !isCurator,
    staleTime: 2 * 60 * 1000,
    retry: false,
  });
  const membership = query.data?.find((relationship) =>
    relationship.artistId === artistId && relationship.status === "active" && ["owner", "admin"].includes(relationship.role)
  ) ?? null;
  return {
    canManage: Boolean(membership),
    membership,
    isLoading: query.isLoading,
  };
}
