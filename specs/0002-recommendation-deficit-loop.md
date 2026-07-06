# Spec 0002: Deficit-incremental backfill loop with streaming reveal

## Prerequisite
Spec 0001 deployed (filter + ID threading exist).

## Problem
After Spec 0001 filters leaks, the user may see <6 recommendations with no
recovery. The filter is correct but terminal — one call, no backfill.

## Goal
Auto-backfill to 6 (3 movies / 3 TV) via a deficit-incremental loop that streams
survivors as they arrive, terminating at 6 or a 3-round cap.

## Decisions
- Loop shape: deficit-incremental, STATELESS (exclude set re-injected each call,
  no model memory).
- Per-call ask = per-category deficit (`requestedMovies`, `requestedTvs`).
- Preserve 3/3 split; accept imbalance only on cap exhaustion.
- Termination: 3-round cap; <6 accepted on exhaustion.
- `tmdbData === null` dropped before survivor count (already in 0001's filter).
- Exclude set = liked ∪ disliked ∪ previous-shown, all ID-keyed.
- previous-shown widened client-side to carry `tmdbData.id`. Persistence still
  client-only (reload forgets — deferred).
- Reveal: stream survivors incrementally (per-round batch in this phase;
  per-item streaming is Spec 0003).
- Loop home: client-orchestrated; server fn = ONE round.
- LoadMore: disabled while loop pending; fresh deficit-6 (3/3) after settled.

## Non-goals
- No new DB table. No SSE transport. No server-side loop.
- No per-item streaming (deferred to Spec 0003).

## Acceptance criteria
1. After load, if round 1 yields <6 clean, rounds 2-3 auto-fire on mount until 6
   or cap. UI appends survivors as each round resolves (no full re-render flicker).
2. The 3/3 split is preserved whenever the cap isn't exhausted.
3. Survivors never include a liked/disliked/already-shown title (ID-keyed).
4. LoadMore button is disabled (visibly) while a loop round is pending.
5. After the loop settles (6 reached OR cap hit), LoadMore works and seeds a fresh
   3/3 deficit request; the loop re-engages to backfill that batch.
6. On cap exhaustion (<6), UI shows what it has without error.

## Files
- `src/lib/ai/recommendations.ts` — input schema: widen `previousRecommendations`
  to `{ id, title, year, category }`; add `requestedMovies`/`requestedTvs` params.
  `simplifyPrevRecs` extends to strip `id` (LLM never sees IDs). System prompt
  line 120: dynamic `"Return exactly {requestedMovies} movies and {requestedTvs} TV series"`.
- `src/lib/data/recommendations.ts` — server fn accepts `requestedMovies`/
  `requestedTvs` + `previousRecommendations` IDs; passes them to AI layer;
  `excludeIds` now includes previous-shown IDs.
- `src/components/recommendations.tsx` — `previousRecommendations` widened to
  carry `id`; auto-loop `useEffect` (rounds 2-3 when survivors<6, cap 3);
  LoadMore disabled while pending, fresh deficit-6 after settled.
- `src/routes/recommendations.tsx` — loader round-1: `requestedMovies:3,
  requestedTvs:3, previousRecommendations:[]`.

## Independence check
- Depends on 0001 (uses its `filterRecommendations` + ID threading).
- Without 0002: app works, bug is fixed, just no backfill (Spec 0001 state).
- With 0002: backfill + streaming + LoadMore gating layered on, no rewrite.
