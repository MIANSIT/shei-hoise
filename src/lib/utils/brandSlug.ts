/**
 * URL-safe slug for a brand name: lowercase letters, digits and dashes. A name
 * with no Latin letters or digits (e.g. Bangla only) falls back to "brand" so
 * the slug is never empty; the server appends a number if that clashes.
 */
export function slugifyBrandName(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "brand";
}
