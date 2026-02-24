/**
 * Slug utilities for Vasanam movie/actor URLs.
 *
 * Canonical slug format: lower-kebab-title-year
 * Example: "Baasha" (1995) → "baasha-1995"
 *
 * Note: When the DB has a stored `slug` column, query by exact match.
 * Until then, these helpers parse the URL slug back to title + year
 * for the ILIKE query fallback.
 */

/** Generate a canonical slug from title and year */
export function generateSlug(title: string, year: number): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, ""); // trim leading/trailing hyphens
  return `${slug}-${year}`;
}

/**
 * Parse a slug back into title search pattern and year.
 * Returns null if the slug format is invalid.
 *
 * Handles edge cases:
 * - Titles with numbers: "7g-rainbow-colony-2004" → titlePattern: "7g%rainbow%colony", year: 2004
 * - Titles ending in numbers that look like years: handled by checking year range
 */
export function parseSlug(slug: string): { titlePattern: string; year: number } | null {
  const parts = slug.split("-");
  if (parts.length < 2) return null;

  // The last part should be a 4-digit year
  const yearStr = parts[parts.length - 1];
  const year = parseInt(yearStr, 10);

  // Validate year is a reasonable movie year (1920-2099)
  if (isNaN(year) || year < 1920 || year > 2099 || yearStr.length !== 4) {
    return null;
  }

  const titleParts = parts.slice(0, -1);
  if (titleParts.length === 0) return null;

  // Build ILIKE pattern: join with % for fuzzy matching
  const titlePattern = titleParts.join("%");

  return { titlePattern, year };
}
