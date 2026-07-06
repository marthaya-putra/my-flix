# Spec 0001: ID-based exclusion filter for liked/disliked recommendations

## Problem
The LLM recommends already-liked and already-disliked films despite the prompt
forbidding them. Root cause: exclusion is enforced ONLY by prompt text
(`src/lib/ai/recommendations.ts:115-118`). No code-level filter exists between
LLM output and the user — `enrichRecommendationsWithTMDB:124-127` strips
`undefined` that never occurs (no-op). The LLM's highest-probability outputs ARE
the forbidden titles, so it leaks regardless of prompt strength or context size.

## Goal
Remove liked and disliked titles from LLM output by filtering on TMDB ID AFTER
enrichment, before returning to the user. No loop, no streaming, no client changes.

## Decisions (this phase)
- Exclude set = liked IDs ∪ disliked IDs (TMDB-ID keyed, symmetric).
- `tmdbData === null` items dropped before return (no ID → filter unsound; renders broken UI).
- previous-shown filtering stays prompt-only this phase (deferred to 0002).
- IDs threaded through `getAllUserContent` (stop dropping `preference_id`); no extra DB queries.
- LLM never sees IDs (existing `simplifyWatched` strips to {title,year}).
- Prompt asks unchanged: exactly 6 (3/3). If filter removes items, <6 shown. UI renders arbitrary length.

## Non-goals
- No deficit loop, no backfill, no streaming. (Spec 0002.)
- No previous-shown persistence. (Deferred.)
- No prompt changes.

## Acceptance criteria
1. Like a mainstream film the LLM loves (e.g. a top-250 title). Trigger recommendations.
   The liked film never appears in the returned set.
2. Dislike a film. Trigger recommendations. It never appears.
3. A title whose TMDB lookup fails (`tmdbData === null`) is not shown.
4. If fewer than 6 survive, the UI still renders cleanly (no crash, no empty-state regression).
5. LoadMore still works and appends; the LLM prompt payload is byte-identical to today.

## Files
- `src/lib/data/preferences.ts` — `getAllUserContent` (~687-770): widen
  `movies/tvs/dislikedMovies/dislikedTvs` maps to keep `id` (`preference_id`).
  Defensive: items without `id` pass through (rare; wizard writes them).
- `src/lib/data/recommendations.ts` — add `filterRecommendations(enriched, excludeIds)`
  (drops null `tmdbData`, drops any `tmdbData.id ∈ excludeIds`); call it in
  `getRecommendations` before return (insert ~line 169). Build `excludeIds` from
  `userPrefs` IDs. Widen input schema/types to accept IDs.
- No client, route, or AI-layer changes.

## Independence check
- App works without 0002. Value delivered: the reported bug is fixed.
- Threading IDs is additive; prompt payload unchanged (simplifiers strip).
- Only behavior change: fewer items when leaks removed — that is the value.
