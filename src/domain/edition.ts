import type { EditionId } from '@/editions';

/**
 * Additive publication metadata shared by entities that can surface publicly.
 * Existing API records may omit the field; callers must treat omission as live.
 */
export interface EditionScoped {
  publicationScopes?: EditionId[];
}

export function publicationScopesOf(record?: EditionScoped | null): EditionId[] {
  if (!record?.publicationScopes?.length) return ['live'];
  const scopes = record.publicationScopes.filter(
    (scope): scope is EditionId => scope === 'live' || scope === 'brass',
  );
  return scopes.length ? [...new Set(scopes)] : ['live'];
}

export function isPublishedInEdition(
  record: EditionScoped | null | undefined,
  edition: EditionId = 'live',
): boolean {
  return publicationScopesOf(record).includes(edition);
}
