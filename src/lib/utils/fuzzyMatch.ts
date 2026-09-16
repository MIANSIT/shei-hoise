/**
 * Small in-app fuzzy text matching for product search — no database
 * extension needed. Candidates are scored in memory against the typed query
 * (see searchProductIds.ts, which bounds how many candidates that ever is,
 * regardless of how large a store's catalog grows), which is what lets
 * search use edit distance rather than trigram similarity.
 *
 * That choice matters for exactly the kind of typo a customer actually
 * makes: a transposed pair like "daimon" vs "diamon" shifts almost every
 * 3-letter chunk of the word, which is the worst case for trigram
 * similarity (the two words share barely any trigrams) but a trivially
 * close match by edit distance (2 edits). Edit distance is what actually
 * matches how a human mistypes.
 */

/** Classic Levenshtein edit distance between two strings (case-insensitive). */
export function levenshteinDistance(a: string, b: string): number {
  const s = a.toLowerCase();
  const t = b.toLowerCase();
  const m = s.length;
  const n = t.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prevRow = Array.from({ length: n + 1 }, (_, j) => j);
  let currRow = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    currRow[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = s[i - 1] === t[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        currRow[j - 1] + 1, // insertion
        prevRow[j] + 1, // deletion
        prevRow[j - 1] + cost, // substitution
      );
    }
    [prevRow, currRow] = [currRow, prevRow];
  }
  return prevRow[n];
}

// How many edits a word can be "off" by and still count as a typo of the
// same word rather than a coincidentally-close different word. Short words
// get little to no tolerance — at 3 letters or fewer, almost every word in
// the dictionary is within 1 edit of almost every other, so any tolerance
// there would match everything.
function maxEditDistanceFor(wordLength: number): number {
  if (wordLength <= 3) return 0;
  if (wordLength <= 5) return 1;
  if (wordLength <= 8) return 2;
  return 3;
}

export interface FuzzyMatchResult {
  matched: boolean;
  /** Lower is better: 0 for an exact substring hit, higher for a looser typo match. Used to rank results, not just filter them. */
  score: number;
}

/** Scores how well any word in `queryWords` matches somewhere in `text` — substring beats a typo match, and among typo matches, fewer edits beats more. */
function scoreFuzzyMatch(queryWords: string[], text: string): FuzzyMatchResult {
  const lowerText = text.toLowerCase();
  const textWords = lowerText.split(/\W+/).filter(Boolean);

  let bestScore = Infinity;

  for (const rawWord of queryWords) {
    const word = rawWord.toLowerCase();
    if (!word) continue;

    if (lowerText.includes(word)) {
      bestScore = Math.min(bestScore, 0);
      continue;
    }

    const maxDist = maxEditDistanceFor(word.length);
    if (maxDist === 0) continue;

    for (const textWord of textWords) {
      const dist = levenshteinDistance(word, textWord);
      if (dist <= maxDist) {
        bestScore = Math.min(bestScore, dist);
      }
    }
  }

  return { matched: bestScore !== Infinity, score: bestScore };
}

/**
 * Scores a product against `queryWords` across several weighted fields
 * (e.g. name weighted above description) — an exact hit in a
 * higher-weighted field always outranks a typo hit in a lower-weighted one,
 * since the weight is added directly to the edit-distance score.
 */
export function scoreProductMatch(
  queryWords: string[],
  fields: { text: string | null | undefined; weight: number }[],
): FuzzyMatchResult {
  let best = Infinity;
  for (const { text, weight } of fields) {
    if (!text) continue;
    const { matched, score } = scoreFuzzyMatch(queryWords, text);
    if (matched) best = Math.min(best, score + weight);
  }
  return { matched: best !== Infinity, score: best };
}
