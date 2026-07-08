# Spec 0004: Parallel category streams with server-side backfill

## Prerequisite
Specs 0001 + 0002 + 0003 deployed (ID filter, deficit loop, async-generator streaming).

## Problem
Spec 0003 streams per-item but gates on ONE combined generateObject call
(N movies + M tvs together). One side's LLM/model failure blanks the whole
page; first-card latency = the combined call's full time (whichever token is
slowest); no per-category tuning is possible.

## Goal
Run movie and tv backfills as 2 independent parallel pipelines inside the
single existing server fn: parallel LLM calls, parallel TMDB fan-out, parallel
deficit loops. First-card latency drops to min(side A, side B); one category's
failure no longer kills the other.

## Decisions
- Split layer: LLM. 2 generateObject calls (movie prompt ∥ tv prompt), each
  with its own model-fallback chain (google→mistral).
- API shape: ONE server fn, internally merged. `getRecommendationsStream`
  stays; client contract changes to a sentinel protocol.
- Loops move SERVER-SIDE (B1). Each category runs its own deficit backfill
  (≤MAX_ROUNDS=5, per-side). Client becomes a dumb consumer — drops
  runBackfill/deficit math.
- Yield order: two-phase sentinels. groupStart per category up front (skeletons),
  item yields interleaved as TMDB resolves, groupEnd per category on termination.
- Failure isolation: failed category yields an error sentinel; survivor category
  continues. Three codes: generation_failed, exhausted, enrichment_empty.
- Load more / retry: whole-fn re-call with grown previousRecommendations.
  Re-runs BOTH sides (documented oddity).
- Cost bound: per-side MAX_ROUNDS=5 → 10 calls absolute worst case.
  (A shared MAX_TOTAL_ROUNDS ceiling would require sequential gating and
  kill the parallelism; rejected.)
- Tuning: deferred to v1. Architecture supports per-category model/counts/
  prompt later.
- Model swap: mistral-large-latest → mistral-medium-latest (orthogonal 1-line
  change in models.ts; faster fallback).

## Non-goals
- No per-category model/counts/prompt tuning (deferred).
- No onlyCategories param / per-category load-more (deferred — whole re-call now).
- No seeding likedItems/dislikedItems from DB on mount (pre-existing gap).
- No new DB table. No SSE transport (async generator stays the transport).

## Acceptance criteria
1. On load, 2 groupStart events fire; skeletons render per category.
2. First item renders at ~min(movie side, tv side), not after a combined call.
3. If movie's entire backfill fails (all models throw), movie yields a
   generation_failed groupEnd while tv items continue to stream.
4. exhausted is returned only when ≥1 round produced raw LLM output but 0
   survivors survived the ID filter across all rounds.
5. enrichment_empty is returned when LLM output was non-empty but every TMDB
   lookup returned null.
6. generation_failed is returned when both models threw on every attempted
   round, OR round 1 returned 0 raw items.
7. LoadMore / retry re-calls the fn with all-shown as previousRecommendations;
   both pipelines re-run.
8. Like/dislike optimistic handlers unchanged.
9. Worst case ≤10 LLM calls per full load (5 movie + 5 tv).

## Files
- src/lib/ai/models.ts — mistral-large-latest → mistral-medium-latest.
- src/lib/data/recommendations.ts — rewrite getRecommendationsStream: extract
  backfillCategory async generator (per-category model-fallback loop + ID-filter
  accumulation + status classification), add StreamEvent sentinel types,
  add race-merge helper, yield groupStart/groupEnd. Add onlyCategory arg to
  getAIRecommendations (or zero the other requested* count).
- src/lib/ai/recommendations.ts — getAIRecommendations accepts onlyCategory
  (movie | tv); system prompt + requested counts scoped accordingly.
- src/components/recommendations.tsx — consume StreamEvent protocol; drop
  TARGET_PER_CATEGORY/MAX_ROUNDS/OVERASK_BUFFER/deficit math/runBackfill/
  buildPreviousWithIds; add categoryStatus + categoryError state; render
  per-category error card on groupEnd{error}.
- specs/0004-parallel-category-streams.md — this spec.

## Independence check
- Depends on 0001 + 0002 + 0003 (reuses filter, loop semantics, streaming).
- Without 0004: app works, per-item streaming works — just one combined LLM
  call, no failure isolation, combined-call first-card latency.
- With 0004: 2 parallel pipelines, failure isolation, snappier first card.
  No change to the filter logic or the TMDB enrichment fan-out.

## Risks
- Client rewrite is the biggest surface (~150 lines of recommendations.tsx
  restructured). Server change is moderate.
- Race-merge helper must drain both generators and emit groupEnd exactly once
  per category even if one throws — wrap each in try/catch converting throws
  to generation_failed.
- Exhaustion-vs-generation_failed edge case: round 1 returns 0 raw items but
  didn't throw → classify as generation_failed, not exhausted (exhaustion
  requires the filter to have eaten items).
- Mistral-medium-latest weaker on structured output than large — monitor
  fallback failure rate after ship.
