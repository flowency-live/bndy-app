const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

export interface JoinArtistInput {
  name: string;
  location: string;
  artistType?: string;
  actType?: string[];
  acoustic?: boolean;
  genres?: string[];
  facebookUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  bio?: string;
  profileImageUrl?: string;
}

export type JoinArtistResult =
  | { ok: true; artist: { id: string; name: string; location?: string; ownerUserId?: string }; relationship: { id: string; role: "owner"; status: string } }
  | { ok: false; kind: "existing"; artist?: { id: string; name: string; location?: string; nameVariants?: string[] } | null; candidates: Array<{ id: string; name: string; location?: string; nameVariants?: string[] }>; matchedBy?: string | null; matchedVariant?: string | null }
  | { ok: false; kind: "error"; message: string; code?: string };

export async function joinArtist(input: JoinArtistInput): Promise<JoinArtistResult> {
  const response = await fetch(`${BASE}/api/join/artists`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const body = await response.json().catch(() => ({})) as Record<string, unknown>;

  if (response.status === 201) {
    return {
      ok: true,
      artist: body.artist as { id: string; name: string; location?: string; ownerUserId?: string },
      relationship: body.relationship as { id: string; role: "owner"; status: string },
    };
  }

  if (response.status === 409 && body.code === "EXISTING_ENTITY") {
    return {
      ok: false,
      kind: "existing",
      artist: (body.artist as { id: string; name: string; location?: string; nameVariants?: string[] } | null | undefined) ?? null,
      candidates: (body.candidates as Array<{ id: string; name: string; location?: string; nameVariants?: string[] }> | undefined) ?? [],
      matchedBy: body.matchedBy as string | null | undefined,
      matchedVariant: (body.variant ?? body.matchedVariant) as string | null | undefined,
    };
  }

  return {
    ok: false,
    kind: "error",
    message: (body.error as string | undefined) ?? `Join failed (${response.status})`,
    code: body.code as string | undefined,
  };
}
