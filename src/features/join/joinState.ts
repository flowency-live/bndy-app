export type JoinEntityType = "artist" | "venue";
export type JoinIntent = "new" | "claim";

export interface JoinJourneyState {
  version: 1;
  entityType: JoinEntityType;
  intent: JoinIntent;
  name: string;
  location?: string;
  entityId?: string;
  googlePlaceId?: string;
  address?: string;
  confirmNew?: boolean;
  savedAt: number;
}

const KEY = "bndy.join.v1";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export function saveJoinState(state: Omit<JoinJourneyState, "version" | "savedAt">): void {
  if (typeof window === "undefined") return;
  const value: JoinJourneyState = { ...state, version: 1, savedAt: Date.now() };
  window.localStorage.setItem(KEY, JSON.stringify(value));
}

export function readJoinState(entityType?: JoinEntityType): JoinJourneyState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as JoinJourneyState;
    if (parsed.version !== 1 || Date.now() - parsed.savedAt > MAX_AGE_MS) {
      window.localStorage.removeItem(KEY);
      return null;
    }
    if (entityType && parsed.entityType !== entityType) return null;
    return parsed;
  } catch {
    window.localStorage.removeItem(KEY);
    return null;
  }
}

export function clearJoinState(): void {
  if (typeof window !== "undefined") window.localStorage.removeItem(KEY);
}
