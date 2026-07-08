# Spec 0005: Per-category prompt differentiation

## Prerequisite
Specs 0001–0004 deployed (ID filter, deficit loop, streaming, parallel category streams).

## Problem
0004 added `onlyCategory` to `getAIRecommendations`, but `buildPrompt`
still ships the WRONG category's full data to the LLM: a movie-only call
still embeds the user's liked TVs, disliked TVs, and the full
previousRecommendations list. Pure token waste, and the LLM is distracted
by irrelevant taste signal (the tv side's data has no bearing on a
movie-only ask).

## Goal
Scope the prompt per category — drop the wrong category's data so each
call only carries the taste signal relevant to its side. Two wins:
token cost (measurable) and quality (focused model).

## Decisions
- `onlyCategory` made **required** in `getAIRecommendations`. No
  combined-call path remains — `backfillCategory` always sets it.
  Removes every `undefined` branch downstream.
- **Filter before render:** the `cleanData` builder omits the wrong
  category's `previouslyLiked*` / `disliked*` / `previousRecommendations`
  before `buildPrompt`. `buildPrompt` stays a dumb template — it renders
  whatever arrays it's given, no category branching inside.
- `previousRecommendations` scoped to **same category only** in the
  prompt. Cross-category dedup is already handled by the server-side ID
  filter at survivor resolution (Spec 0001), so the prompt doesn't need
  to repeat it.
- `favoriteActors` / `favoriteDirectors` / `genres` **kept** on both
  sides — these are category-agnostic taste signal (an actor works in
  film and tv). Removing them would hurt quality.
- System prompt tailoring (role + count only):
  - Role line scoped: `onlyCategory === "movie"` → "movie recommendation
    expert"; `"tv"` → "TV series recommendation expert".
  - Return-count line drops the "and 0 ..." noise: movie → "Return
    exactly N MOVIES"; tv → "Return exactly N TV SERIES".
  - CRITICAL RULES + QUALITY CONTROL sections unchanged (category-
    agnostic; every extra branch is a maintenance surface).

## Non-goals
- No schema divergence (movie prompt asking for `runtime`, tv for
  `seasons`, etc.). Diverging the schema would ripple into the
  StreamEvent `item` shape and the client. Deferred.
- No heavy per-category rewriting of the QUALITY CONTROL / CRITICAL
  RULES sections.
- No per-category model or counts tuning (still deferred from 0004).

## Acceptance criteria
1. `onlyCategory="movie"` call: prompt body contains Movies /
   Actors / Directors / Genres / dislikedMovies / same-category
   previousRecommendations only. No TVs data, no dislikedTvs data, no
   tv-category previousRecommendations.
2. `onlyCategory="tv"` call: symmetric — TVs / Actors / Directors /
   Genres / dislikedTvs / tv-category previousRecommendations only.
3. System prompt role line and return-count line are scoped per
   category; the "and 0 TV SERIES" / "and 0 MOVIES" branches are gone.
4. `onlyCategory` is non-optional in the zod schema and in
   `buildPrompt`'s signature.
5. No change to streaming transport, the ID filter, the deficit loop,
   or the StreamEvent contract. Client and `data/recommendations.ts`
   untouched.

## Files
- `src/lib/ai/recommendations.ts` — `onlyCategory` required;
  `cleanData` scoping; system prompt role + count tailoring.
- `src/lib/data/recommendations.ts` — no change.
- `src/components/recommendations.tsx` — no change.
- `specs/0005-prompt-differentiation.md` — this spec.

## Independence check
- Reuses 0004's `onlyCategory` plumbing (already threaded through
  `backfillCategory`).
- Without 0005: 0004 works, but over-ships tokens on every call and
  keeps an unfocused prompt.
- With 0005: smaller, category-focused prompts; cost win measurable,
  quality win anecdotal.
- No change to the filter logic, the deficit loop, the race-merge, or
  the TMDB enrichment fan-out.

## Risks
- Dropping cross-category prevRecs from the prompt leaves a narrow
  double-mislabel dedup edge case (movie prompt emits a tv title
  mislabeled as a movie AND the tv prompt emits the same title). The
  server-side ID filter catches it at survivor resolution in the
  common case; the residual risk is a tmdb-id mismatch across the two
  category lookups, which is rare.
- The quality lift is anecdotal until measured. The cost win (fewer
  input tokens per call, growing round-over-round as same-category
  prevRecs accumulate) is the measurable one.
