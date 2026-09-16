/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "@/lib/supabase";
import { scoreProductMatch } from "@/lib/utils/fuzzyMatch";

interface SearchCandidateRow {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  short_description: string | null;
}

export interface SearchProductIdsOptions {
  statusEq?: string;
  excludeBundles?: boolean;
  categoryId?: string;
  featured?: boolean;
}

function applyStructuralFilters(query: any, storeId: string, options: SearchProductIdsOptions): any {
  let q = query.eq("store_id", storeId);
  if (options.statusEq) q = q.eq("status", options.statusEq);
  if (options.excludeBundles) q = q.neq("product_type", "bundle");
  if (options.categoryId) q = q.eq("category_id", options.categoryId);
  if (options.featured !== undefined) q = q.eq("featured", options.featured);
  return q;
}

// A safety valve, not a realistic constraint: ids are ~36 bytes each, so
// even this many is a small payload, and Postgres filters this query by the
// already-indexed store_id before it ever runs ilike over the remainder —
// cost scales with one store's own catalog, not the platform's. This exists
// so a query can never be literally unbounded, not because catalogs are
// expected to approach it.
const MAX_SUBSTRING_MATCHES = 5000;

/**
 * Tier 1: does ANY word in the query appear as a substring anywhere in
 * name/sku/short_description/description? Filtered and matched entirely in
 * the database — only ids come back, never the row text — so this scales to
 * any catalog size a store ever reaches; it isn't the tier that needs a
 * bound on how much gets scored, because nothing gets scored, Postgres just
 * answers "yes/no" per row via an indexed filter.
 *
 * This alone covers the common real-world miss this whole feature exists
 * for: a customer who types the right words in the wrong order, or only
 * remembers one distinctive word out of a longer product name.
 */
async function findSubstringMatchIds(
  storeId: string,
  words: string[],
  options: SearchProductIdsOptions,
): Promise<string[]> {
  const orFilter = words
    .flatMap((word) => {
      const term = `%${word}%`;
      return [
        `name.ilike.${term}`,
        `sku.ilike.${term}`,
        `short_description.ilike.${term}`,
        `description.ilike.${term}`,
      ];
    })
    .join(",");

  const query = applyStructuralFilters(
    supabase.from("products").select("id"),
    storeId,
    options,
  ).or(orFilter).limit(MAX_SUBSTRING_MATCHES);

  const { data, error } = await query;
  if (error || !data) return [];
  return data.map((row: { id: string }) => row.id);
}

// This tier is what genuinely needs a hard ceiling: it fetches candidates'
// text and scores each one in the app, which is real per-row work rather
// than a single indexed filter. It only ever runs when tier 1 above found
// zero substring hits for the *entire* query, which narrows when this bound
// could matter to a specific, rare intersection: a store with more than this
// many products, a search that doesn't substring-match anywhere at all, and
// the one product the customer meant sitting alphabetically past this cutoff.
// A real Postgres-side fuzzy match (e.g. `levenshtein()` from the
// fuzzystrmatch extension) would remove even that gap, but shipping an
// unverified SQL function to a live production database is a worse risk
// than this narrow, honestly-documented one — this can be revisited with
// proper testing against the real database if it ever matters in practice.
const MAX_FUZZY_CANDIDATES = 1000;

async function findFuzzyMatchIds(
  storeId: string,
  words: string[],
  options: SearchProductIdsOptions,
): Promise<string[]> {
  const query = applyStructuralFilters(
    supabase.from("products").select("id, name, sku, description, short_description"),
    storeId,
    options,
  )
    .order("name", { ascending: true })
    .limit(MAX_FUZZY_CANDIDATES);

  const { data, error } = await query;
  if (error || !data) return [];

  return (data as SearchCandidateRow[])
    .map((row) => ({
      id: row.id,
      ...scoreProductMatch(words, [
        { text: row.name, weight: 0 },
        { text: row.sku, weight: 0 },
        { text: row.short_description, weight: 0.5 },
        { text: row.description, weight: 1 },
      ]),
    }))
    .filter((r) => r.matched)
    .sort((a, b) => a.score - b.score)
    .map((r) => r.id);
}

/**
 * Resolves which of a store's product ids match `searchQuery` — used instead
 * of a single plain `ilike` filter so a reordered multi-word search still
 * finds the right product regardless of catalog size (tier 1), and a
 * genuine misspelling still finds something when nothing substring-matches
 * at all (tier 2 — see its own doc comment for the one bound that remains).
 */
export async function searchProductIds(
  storeId: string,
  searchQuery: string,
  options: SearchProductIdsOptions = {},
): Promise<string[]> {
  const words = searchQuery.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];

  const substringMatches = await findSubstringMatchIds(storeId, words, options);
  if (substringMatches.length > 0) return substringMatches;

  return findFuzzyMatchIds(storeId, words, options);
}
