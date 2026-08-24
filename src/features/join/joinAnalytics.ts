const BASE = typeof window !== "undefined" && window.location.hostname.endsWith("bndy.live")
  ? ""
  : (process.env.NEXT_PUBLIC_API_URL || "https://api.bndy.co.uk");

const SESSION_KEY = "bndy.join.analytics.session";

export type JoinAnalyticsEvent =
  | "join_opened"
  | "entity_type_selected"
  | "identity_search_submitted"
  | "existing_candidate_shown"
  | "candidate_accepted"
  | "candidate_rejected"
  | "claim_branch_entered"
  | "claim_requested"
  | "create_new_confirmed"
  | "auth_gate_shown"
  | "entity_creation_completed"
  | "entity_creation_duplicate_gated"
  | "entity_creation_failed"
  | "profile_step_completed"
  | "profile_step_skipped"
  | "join_completed"
  | "delegate_invitation_created"
  | "delegate_invitation_accepted"
  | "delegate_revoked"
  | "ownership_transferred";

function sessionId(): string {
  if (typeof window === "undefined") return "server";
  const existing = window.sessionStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const next = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.sessionStorage.setItem(SESSION_KEY, next);
  return next;
}

export function trackJoin(event: JoinAnalyticsEvent, data: { entityType?: "artist" | "venue"; step?: string; result?: string } = {}): void {
  if (typeof window === "undefined") return;
  const body = JSON.stringify({ event, sessionId: sessionId(), ...data });
  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon(`${BASE}/api/join/analytics`, blob)) return;
    }
    void fetch(`${BASE}/api/join/analytics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // Analytics is deliberately non-blocking. Joining bndy must never fail because telemetry did.
  }
}
