// Flag a problem (backlog feature 6). Public  -  no account needed.
// A signed-in session cookie rides along automatically, so bndy can
// come back to the reporter. That is the only difference.

const BASE = process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk";

export type FlagEntityType = "artist" | "venue" | "event";

export async function submitFlag(
  entityType: FlagEntityType,
  entityId: string,
  entityName: string,
  reason: string,
): Promise<{ success: boolean; flagId: string }> {
  const res = await fetch(`${BASE}/api/community/flags`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ entityType, entityId, entityName, reason }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || `HTTP ${res.status}`);
  }
  return data as { success: boolean; flagId: string };
}
