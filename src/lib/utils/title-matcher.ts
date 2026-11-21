// Pure title-exclusion matcher (docs/designs/title-first-recommendations.md,
// Components §1). Replaces the TMDB-ID exclude set: a candidate counts as
// "already known" when its (category, normalized title, year ±1) collides
// with a liked, disliked, previously recommended, or already-emitted title.
// Known misses (documented, accepted): translated / alternative titles;
// same title re-suggested with year drift > 1 (the old ID set was year-blind).

export type TitleCategory = "movie" | "tv";

// Minimal shape every exclusion source (liked, disliked, prevRecs, emitted
// survivors) can supply. `id`, when present, is ignored — matching is by
// title text, not TMDB identity.
export type TitleRef = {
  category: TitleCategory;
  title: string;
  year: number;
};

// Ordered pipeline: lowercase → strip diacritics → remove non-alphanumeric
// except spaces → drop leading article (the/a/an) → collapse whitespace.
export function normalizeTitle(input: string): string {
  const lowered = input.toLowerCase();
  const unaccented = lowered.normalize("NFD").replace(/\p{M}/gu, "");
  const cleaned = unaccented.replace(/[^\p{L}\p{N} ]/gu, "");
  const dearticled = cleaned.replace(/^(?:the|a|an)\s+/u, "");
  return dearticled.replace(/\s+/g, " ").trim();
}

// True when both refs name the same title: same category, equal normalized
// titles, and release years at most 1 apart (festival vs wide release).
export function isSameTitle(a: TitleRef, b: TitleRef): boolean {
  return (
    a.category === b.category &&
    Math.abs(a.year - b.year) <= 1 &&
    normalizeTitle(a.title) === normalizeTitle(b.title)
  );
}

// First source (liked, disliked, prevRecs, earlier survivors) that already
// contains the candidate, or null. Returned source label feeds the per-run
// matcher exclusion counts in the RECO_DEBUG_LOG line.
const EXCLUSION_SOURCES = ["liked", "disliked", "prevRecs", "round"] as const;
export type ExclusionSource = (typeof EXCLUSION_SOURCES)[number];
export type ExclusionPools = Record<ExclusionSource, TitleRef[]>;

export function exclusionHitFor(
  candidate: TitleRef,
  pools: ExclusionPools,
): ExclusionSource | null {
  for (const source of EXCLUSION_SOURCES) {
    if (pools[source].some((entry) => isSameTitle(entry, candidate))) {
      return source;
    }
  }
  return null;
}
