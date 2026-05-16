// Single source of truth for name <-> slug. The reverse is intentionally
// lossy ("Saint-Émilion" -> "saint-emilion"); callers that need the row
// look it up by computing nameToSlug(row.name) on a fetched list and
// comparing strings, instead of trying to reconstruct the name.

export function nameToSlug(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}
