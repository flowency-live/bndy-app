import type { FacebookSourceInspection } from "./wizardApi";

const OBSERVED_NAME_EVIDENCE = new Set([
  "facebook_html_meta",
  "facebook_basic_html",
  "facebook_structured_html",
  "facebook_about_html",
  "backline_grounded_search",
]);

const OBSERVED_DETAIL_EVIDENCE = new Set([
  "facebook_html_meta",
  "facebook_basic_html",
  "facebook_structured_html",
  "facebook_about_html",
  "bndy_existing_artist",
  "backline_grounded_search",
]);

export interface ArtistFacebookPrefill {
  facebookUrl?: string;
  name?: string;
  verifiedSourceName: boolean;
  profileImageUrl?: string;
  location?: string;
  bio?: string;
  websiteUrl?: string;
  artistType?: string;
  actTypes?: string[];
  genres?: string[];
  acoustic?: boolean;
}

function sourcedValue(
  value: string | null | undefined,
  evidence: string | undefined,
): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || !evidence || !OBSERVED_DETAIL_EVIDENCE.has(evidence)) return undefined;
  return trimmed;
}

/**
 * Convert an inspector response into fields that are safe to prefill into an
 * artist form. The backend remains authoritative for source extraction; this
 * helper only decides how much trust the UI should place in each evidence tag.
 */
export function artistFacebookPrefill(result: FacebookSourceInspection): ArtistFacebookPrefill {
  const name = result.observed?.name?.trim() || undefined;
  const nameEvidence = result.evidence?.name;
  const isHandleHint = nameEvidence === "facebook_handle_hint";
  const observedName = !!name && !!nameEvidence && OBSERVED_NAME_EVIDENCE.has(nameEvidence);

  return {
    facebookUrl: result.facebookUrl || undefined,
    name: observedName || isHandleHint ? name : undefined,
    verifiedSourceName: observedName,
    profileImageUrl: result.observed?.imageUrl?.trim() || undefined,
    location: sourcedValue(result.observed?.location, result.evidence?.location),
    bio: sourcedValue(result.observed?.description, result.evidence?.description),
    websiteUrl: sourcedValue(result.observed?.websiteUrl, result.evidence?.websiteUrl),
    artistType: sourcedValue(result.observed?.artistType, result.evidence?.artistType),
    actTypes: result.evidence?.actTypes === "backline_grounded_search" ? result.observed?.actTypes : undefined,
    genres: result.evidence?.genres === "backline_grounded_search" ? result.observed?.genres?.slice(0, 3) : undefined,
    acoustic: result.evidence?.acoustic === "backline_grounded_search" ? result.observed?.acoustic : undefined,
  };
}
