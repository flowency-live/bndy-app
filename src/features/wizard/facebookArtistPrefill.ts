import type { FacebookSourceInspection } from "./wizardApi";

const OBSERVED_NAME_EVIDENCE = new Set([
  "facebook_html_meta",
  "facebook_basic_html",
  "facebook_structured_html",
  "facebook_about_html",
]);

const OBSERVED_DETAIL_EVIDENCE = new Set([
  "facebook_html_meta",
  "facebook_basic_html",
  "facebook_structured_html",
  "facebook_about_html",
  "bndy_existing_artist",
]);

export interface ArtistFacebookPrefill {
  facebookUrl?: string;
  name?: string;
  verifiedSourceName: boolean;
  profileImageUrl?: string;
  location?: string;
  bio?: string;
  websiteUrl?: string;
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
  };
}
