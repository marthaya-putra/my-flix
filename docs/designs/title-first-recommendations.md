# Title-First Recommendations + Per-Run Taste Profile

*   **Author:** marthaya-putra
*   **Status:** Proposed
*   **Date:** 2026-11-21

--------------------------------------------------------------------------------

## Overview

my-flix is a single-user movie/TV recommendation app. Today, a recommendation run asks an LLM for candidate titles, then calls TMDB per candidate to fetch a poster before any card can render. That TMDB step blocks the first card, and when the LLM proposes a title TMDB cannot find (misspelled, wrong year, or invented), the candidate is discarded and the pipeline runs another LLM round to replace it — extra delay, extra cost, and the failure has nothing to do with taste. (Terminology: the old blocking TMDB step is "enrichment" in code (`enrichFail`); this document calls its replacement the "poster lookup".)

This design removes TMDB from the critical path and adds a taste-profile step:

1. **Title-first cards.** The LLM's picks (title, year, rating, reason) render on the card immediately. Poster lookups run in the background and deliver a full `FilmInfo` per card when they settle; if a lookup fails or times out, the existing fallback stays. There are no retry rounds at all: the single LLM round asks for a surplus (overask) so duplicates and misses are absorbed by extra candidates.
2. **Per-run taste profile.** One extra small LLM call per run reads the user's last ≤100 liked titles and favorite people and writes a short taste summary (themes, tones, plot affinities). The summary is injected into the recommendation prompt. It is computed fresh each run, never stored, and any failure leaves the run identical to today's behavior.
3. **Title+year exclusion.** Duplicate protection switches from TMDB-ID equality to normalized title+year+category matching against liked, disliked, and previously recommended (prevRecs, wire field `previousRecommendations`) titles.

This is R&D: the author is the sole user and judge of whether recommendations improve.

## The Problem

Recommendation quality is limited by two mechanisms in the current pipeline (`src/lib/data/recommendations.ts`):

*   **TMDB enrichment blocks and rejects.** Each candidate needs 1-2 TMDB searches before its card can render. Candidates that fail the search (`enrichFail` — the largest reject cause in the per-round breakdown logs, `recommendations.ts:347-349`; author-observed) trigger deficit rounds: new LLM calls with longer prompts and exclusion lists. This couples card delivery to an external API and burns LLM calls replacing titles that may have been perfectly good taste matches.
*   **Taste is passed as raw data, not distilled.** The prompt embeds the full liked-titles list, favorite people names, and an unordered genre set. The model re-derives the user's pattern from raw rows every call, with no explicit statement of what the user consistently gravitates toward (tones, themes, plot shapes, recurring people they never explicitly favorited).

The proposed solution: let the LLM's own knowledge carry the recommendation end to end (it already writes the ratings and reasons shown today), move posters to a background patch, and add one distillation call that states the user's taste pattern explicitly.

## Goals

*   Reco cards render directly from LLM output; no TMDB call sits on the critical path.
*   Posters arrive via background patch delivering full `FilmInfo`; lookup failure or timeout never removes or delays a card.
*   One LLM round per category with overask surplus (~2× target); no deficit retry rounds.
*   A per-run taste profile is injected into the reco prompt; it is fail-open (failure → today's prompt exactly).
*   Duplicate exclusion works via normalized title+year+category matching, unit-tested, deterministic.
*   A structured per-run debug line records output titles, patch outcomes, and matcher exclusions; an offline script reports the fake-title rate from it.

## Non-Goals

*   Stored profiles, recompute triggers, invalidation logic, weights tables.
*   TMDB credits fan-out or any per-title metadata fetching for taste derivation.
*   MCP server integration.
*   Telemetry, impressions tables, like-rate metrics.
*   UX additions: "seen" marker, "more/less like this" controls.
*   In-path title verification beyond the poster lookup itself (prompt-only hallucination constraint; measurement happens offline via the debug line).
*   Speed/time-to-first-card as a tracked target (dropped; cards get faster as a side effect, not a success criterion).

## Open Questions

None currently. (The poster-patch mechanism and the reason-fence mitigation were both decided during review — see Technical Plan.)

## Critical User Journeys (CUJs)

### CUJ 1: Reco cards render without waiting for TMDB

*   **Given**: an authenticated user with enough preferences to pass the onboarding gate; the recommendations page is open.
*   **When**: a reco run starts (mount or load-more).
*   **Then**: each accepted pick renders as a card with title, year, rating, and reason as soon as the LLM round returns (the profile step runs under the `loading_preferences` stage before it); poster slots show an awaiting-patch skeleton; `FilmInfo` patches arrive after all lookups settle, in item order; a failed or timed-out lookup leaves the fallback; no card is ever delayed or dropped by a TMDB failure.

### CUJ 2: Taste profile fails invisibly

*   **Given**: the taste-profile LLM call errors or times out (8s total budget across the model fallback loop).
*   **When**: the reco run proceeds.
*   **Then**: the prompt contains no TASTE PROFILE section; the user sees normal recommendations; the only observable difference is a warning log line. (The behavioral difference — profile text present or absent in the prompt — is asserted by the test suite, not the stream.)

### CUJ 3: Fake title renders and is detected offline

*   **Given**: the reco LLM invents a title despite the prompt constraint.
*   **When**: the run completes.
*   **Then**: the card renders in the no-data state (skeleton → fallback poster, non-interactive: accepted); the debug line records the patch miss; the offline script counts it in the fake-title rate; exclusion still treats it as previously recommended via title+year because `buildPreviousWithIds` no longer filters to id-bearing items.

## Technical Plan (Architecture)

### Poster patch: server-emitted event (decided)

The stream route stays the single server-authoritative channel. `StreamEvent` changes:

*   `item`: `tmdbData` becomes optional (LLM-only items yield immediately).
*   `itemPatch` (new): `{ category, title, releasedYear, filmInfo: FilmInfo | null }` — keyed by the natural key (category, title, year). The patch echoes the item's LLM title/year verbatim, never TMDB-corrected values (corrected values would break client addressing). Unknown keys are ignored.
*   `StreamStatus` reduces to `ok | generation_failed` (`enrichment_empty` and `exhausted` become unreachable with the retry loop deleted); client `STATUS_MESSAGES` and the `isError` branch are updated to match.

Flow inside the per-category generator (`backfillCategory`): after the matcher filter, items yield in order; then poster lookups (`searchTitleWithYearFallback`, unchanged) run concurrently, each with a 10s `AbortSignal.timeout`; the generator awaits `Promise.allSettled` and emits one `itemPatch` per item in item order; `groupEnd` follows. Patches therefore arrive deterministically ordered, and the wait is bounded by the per-lookup timeout.

Abort wiring: the stream route's `request.signal` is threaded into the TMDB search functions (`searchMoviesAPI`/`searchTVsAPI` gain an `AbortSignal` parameter); `raceMerge` gains a try/finally that forwards `return()` to the child generators so client disconnect cancels in-flight lookups.

### Data flow

```text
POST /api/recommendations/stream
  └─ runPipelines (memoized loadPrefs + memoized deriveProfile)
       └─ per category (movie / tv-series) generator:
            1. profile step (LLM #1, fail-open, 8s total budget)
               [stage: loading_preferences]
            2. single LLM round (generateObject), overask = 2 × TARGET_PER_CATEGORY
               [stage: finding_titles]
            3. matcher filter: category + normalized title + year (±1)
               against liked ∪ disliked ∪ prevRecs ∪ earlier survivors this round
               (within-round duplicates also filtered)
            4. yield `item` per survivor, in order (title, year, rating, reason;
               tmdbData absent)
            5. background: poster lookup per item (10s timeout each)
               → await allSettled → yield `itemPatch` per item in item order
               [stage: looking_up_posters covers this phase]
            6. groupEnd
  NDJSON line per event → client patches card state
```

### Components

**1. Exclusion matcher (new, pure module)**
`normalizeTitle(s)`: lowercase → strip diacritics → remove non-alphanumeric except spaces → drop leading article (the/a/an) → collapse whitespace.
`isSameTitle(a, b)`: same `category` AND normalized title equality AND `|yearA - yearB| ≤ 1`.
Replaces the TMDB-ID exclude set. `previousRecommendations` (client-supplied) is matched the same way. Deterministic; unit-tested. Known misses (documented, accepted): translated/alternative titles; same title re-suggested with year drift > 1 (the old ID set was year-blind). Per-round matcher exclusion counts are logged.

**2. Taste profile (new module `src/lib/ai/taste-profile.ts`)**
Input: last ≤100 liked titles (explicit `createdAt desc` ordering — not the repo's accidental `updatedAt` ordering, `user-preferences.ts:113`), favorite people names, in-memory genre counts from per-title genres on `UserContent`. Output zod schema: `{ themes: string[], tones: string[], plotAffinities: string[], summary: string }` — each array ≤6 items, each item ≤40 chars and anchored to a liked title where possible ("cerebral sci-fi — Inception, Arrival"); `summary` ≤300 chars. Render template joins all fields into the prompt section with a total bound. One `generateObject` per model in google→mistral order via a shared fallback helper; `maxRetries: 0`; total timeout 8s across the loop; try/catch → `null`.

**3. Pipeline wiring (`runPipelines`)**
New optional param `deriveProfile?: (content: UserContent) => Promise<string | null>`. Internally: the memoized `loadPrefs` result feeds `deriveProfile`, and the memoized profile text flows into both category generators — one profile call per run, one DB read per run. Absent thunk or `null` result → prompt built exactly as today, plus one warning log line. The vitest suite stays LLM-free (thunk + module mocks only).

**4. Prompt changes (`src/lib/ai/recommendations.ts`)**
`buildPrompt` (exported for tests) renders a "TASTE PROFILE" section in the user-data block when a profile exists; `tasteProfile` threads through `RecommendationInput` → `cleanData` → `PromptData`. System prompt gains two lines: (a) hallucination constraint — only well-known, real, verifiable titles; internally confirm existence before answering; (b) reason fence (decided during review) — every reason names a concrete liked title or favorite person; never paraphrase profile language. Raw liked list stays in the prompt (exclusion + reason anchors).

**5. Overask replaces the retry loop (decided)**
`backfillCategory` runs one LLM round asking `2 × TARGET_PER_CATEGORY` candidates (`TARGET_PER_CATEGORY = 3`, so ask 6, cap survivors at 3 — cap logic already exists, `recommendations.ts:309-313`). Deleted: `MAX_ROUNDS`, `STRICT_RATING_ROUNDS`, retry progress events/messages, `exhausted` status. Rating-bar text stays prompt-only in the single round. Consequence (accepted, see Risks below): a fake title consumes one target slot that run and is not replaced; the debug line makes the rate visible.

**6. Enrichment reclassification (`src/lib/data/recommendations.ts`)**
`enrichFail`/`excluded` round loop disappears; the matcher filter is the only reject step and logs its counts. Poster lookup failure emits `itemPatch` with `filmInfo: null` — no retry, no round.

**7. Offline verification script**
`scripts/verify-titles.mjs` consumes the structured `RECO_DEBUG_LOG` line (JSON: run id, titles+years, patch outcomes, matcher excluded counts) — it does not re-query TMDB, so its oracle is exactly the pipeline's own lookup. Run: `node scripts/verify-titles.mjs <logfile>` with `TMDB_TOKEN` set; prints per-title hit/miss and the fake-title rate.

**8. Card state machine**
`awaiting-patch`: poster slot shows a skeleton (not the "No poster available" copy — the poster may still arrive). `patch-failed` / `no-data`: existing fallback; like/dislike/watchlist buttons render only once `filmInfo` arrives via patch; cards that never get `filmInfo` stay non-interactive (accepted).

**Risks accepted by the author (R&D mode):** fake titles render as real-looking cards and consume target slots unreplaced until the offline script shows the prompt mitigation is insufficient; poster patch failures/timing leave posterless cards at an unknown rate; occasional repeat recos from matcher misses; two taste sources share the prompt (raw liked list + additive profile) with model arbitration unpinned; rating display remains LLM-claimed (TMDB `voteAverage` no longer fetched in path).

## Alternatives Considered

### Alternative A: Numeric signal-weighting agent (original round-1 concept)

*   **Pros**: expressed user taste as explicit weights; felt tunable.
*   **Cons**: no consumer — the pipeline has no scorer, so weights could only become advisory prompt text next to instructions that already say "prioritize these genres"; retry causes (TMDB misses, dupes) were uncorrelated with weighting; genre/person counts are computable in SQL without an agent.
*   **Reason for Rejection**: Rejected by review — mechanism had no effect path; superseded by deterministic counts plus the profile's knowledge-based inference.

### Alternative B: Stored taste profile, recomputed on preference change

*   **Pros**: profile computed once per taste change, zero per-run cost.
*   **Cons**: the repo has no queue/cron/after-response hook to run it off-path; the trigger must cover eight write paths (`preferences.ts:82,105,140,161,277,342,398,463` — one hidden in `toggleDislike`'s like-deleting branch); a missed path means silently stale taste.
*   **Reason for Rejection**: Rejected by review — staleness bug class with no execution substrate; per-run derivation removes the class entirely.

### Alternative C: TMDB credits fan-out for derived cast/director taste

*   **Pros**: grounded people data; would catch directors the user never favorited.
*   **Cons**: up to 100 uncached TMDB calls per recompute; no cache layer exists; TV credits need a different endpoint shape; derived people double-count with explicit `user_people` favorites.
*   **Reason for Rejection**: Rejected by author and review — data-platform cost for one prompt section; the profile step's model knowledge covers the same signal at zero calls.

### Alternative D: MCP TMDB server for title verification

*   **Pros**: community servers exist; AI SDK can talk to them; lets the model self-verify candidates.
*   **Cons**: wraps the same TMDB API behind a protocol plus a running server; verification flow is fixed (title+year → id), which suits a plain fetch; model-driven tool loops add roundtrips per candidate.
*   **Reason for Rejection**: Rejected by author — infra cost without new capability; prompt-only mitigation plus offline measurement chosen instead.

### Alternative E: Client-side poster patch (fetch endpoint per card)

*   **Pros**: StreamEvent contract and mock suite untouched; server stream stays minimal.
*   **Cons**: new authenticated endpoint; one client request per card; needs abort-on-unmount and dedupe logic; splits the reco data flow across two channels.
*   **Reason for Rejection**: Rejected by author — single server-authoritative channel preferred; contract extension cost accepted once.

### Alternative F: Keep blocking TMDB enrichment (status quo)

*   **Pros**: posters arrive with the card; TMDB acts as a hallucination filter today.
*   **Cons**: blocks first cards on 1-2 TMDB calls per candidate; `enrichFail` discards picks for findability, not taste, and triggers extra LLM rounds; the filter never actually verified the displayed rating anyway.
*   **Reason for Rejection**: Rejected by author — the blocking coupling is the problem being removed; hallucination defense moves to prompt constraints plus offline measurement.

### Alternative G: Prompt-sentence-only profile ("infer patterns from likes before recommending")

*   **Pros**: zero new code, zero extra LLM call.
*   **Cons**: effect indistinguishable from instructions already present in the system prompt; no inspectable profile artifact; cannot carry the last-100 window or person/genre counts explicitly.
*   **Reason for Rejection**: Rejected by author — R&D intent is to test the real profile step.

### Alternative H: Instrumentation-first (impressions table + like-rate baseline before any change)

*   **Pros**: statistically grounded before/after; also fixes cross-session repeats as a side effect.
*   **Cons**: 2-4 weeks of baseline; ~150-200 impressions per arm for power at a 15pp lift (author-estimated traffic) — months at this traffic.
*   **Reason for Rejection**: Rejected by author for now — does not want to wait; single-user judgment replaces statistics. Deferred, not dead.

### Alternative I: Keep the deficit retry loop, overask unchanged

*   **Pros**: replaces rejected candidates after the matcher filter; rating bar relaxes across rounds.
*   **Cons**: with `enrichFail` deleted the loop's remaining triggers are rare (matcher dupes, under-emission) — both absorbed by asking ~2× target once; keeping the loop keeps `MAX_ROUNDS`, retry events/messages, and the largest share of test surface.
*   **Reason for Rejection**: Rejected by author — surplus candidates replace the loop; worst case is 2 cards instead of 3, acceptable when the author is sole judge.

--------------------------------------------------------------------------------

## Non-Functional Requirements

*   **Latency**: profile call adds one serial LLM step ahead of the single round, capped at 8s total; accepted (speed is not a tracked goal; fail-open keeps worst case bounded). Poster wait is bounded by the 10s per-lookup timeout.
*   **Rollback**: profile is behind the optional thunk — removing the route's thunk argument restores today's prompt; title-first rendering and patch events are the structural changes and revert with the branch. No schema migration exists in this design.
*   **External dependency**: TMDB moves to best-effort (posters only). TMDB outage or hang now degrades posters, not recommendations.

--------------------------------------------------------------------------------

## Detailed Implementation Plan

### Target Files to Create/Modify

#### 1. `src/lib/utils/title-matcher.ts` (Create)

*   **Type / Scope**: Pure TypeScript utility.
*   **Proposed Changes**: `normalizeTitle(input)` per the ordered spec: lowercase → strip diacritics → remove non-alphanumeric except spaces → drop leading article (the/a/an) → collapse whitespace. `isSameTitle(a, b)` — same category, normalized equality, year distance ≤ 1.

#### 2. `src/lib/utils/title-matcher.test.ts` (Create)

*   **Type / Scope**: Unit tests.
*   **Proposed Changes**: Punctuation variants ("Dune: Part Two" vs "Dune Part Two"), article moves, diacritics, remakes within year ±1, year drift > 1 (documented miss), category collision (same title+year, movie vs tv — no match), translated-title miss (documented), prevRecs-shape matching.

#### 3. `src/lib/ai/call-with-fallback.ts` (Create)

*   **Type / Scope**: Shared LLM helper.
*   **Proposed Changes**: `callWithFallback(fn, models, { timeoutMs })` — iterates the google→mistral chain, total timeout across the loop, `maxRetries: 0`, try/catch → `null`. Used by both the reco call and the profile call (replaces the hand-rolled loop; keeps failure handling in one place).

#### 4. `src/lib/ai/taste-profile.ts` (Create)

*   **Type / Scope**: LLM module.
*   **Proposed Changes**: `TasteProfileSchema` per Components §2 (bounds: arrays ≤6 × ≤40 chars anchored to liked titles; summary ≤300 chars). `generateTasteProfile(input): Promise<TasteProfile | null>` via `callWithFallback`. `renderProfileText(profile): string` — the single render template used for the prompt section.

#### 5. `src/lib/ai/taste-profile.test.ts` (Create)

*   **Type / Scope**: Unit tests, LLM mocked.
*   **Proposed Changes**: schema rejects over-long/garbage output; model-1 failure falls to model-2; total failure → `null`; render bounds respected.

#### 6. `src/lib/ai/recommendations.ts` (Modify)

*   **Type / Scope**: Reco LLM call + prompts.
*   **Proposed Changes**: Export `buildPrompt`. Optional `tasteProfile` on `RecommendationInput`, threaded through `cleanData` into `PromptData`; `buildPrompt` renders the "TASTE PROFILE" section when present. System prompt: hallucination constraint + reason fence (both final). Output schema unchanged.

#### 7. `src/lib/data/stream-events.ts` (Modify)

*   **Type / Scope**: Wire contract.
*   **Proposed Changes**: `item` variant — `tmdbData` optional. New `itemPatch` variant: `{ category, title, releasedYear, filmInfo: FilmInfo | null }`. `StreamStatus` reduces to `ok | generation_failed`. Stage labels unchanged; `looking_up_posters` message updated to cover the patch phase.

#### 8. `src/lib/data/recommendations.ts` (Modify — core)

*   **Type / Scope**: Pipeline orchestrator.
*   **Proposed Changes**:
    *   Single LLM round with overask: ask `2 × TARGET_PER_CATEGORY`, cap survivors at `TARGET_PER_CATEGORY` (existing cap logic). Delete `MAX_ROUNDS`, `STRICT_RATING_ROUNDS`, retry progress events, `exhausted` status, and the deficit loop.
    *   Matcher filter replaces the enrichment gate: liked ∪ disliked ∪ prevRecs ∪ earlier survivors this round; log excluded counts per run.
    *   Yield `item` events (LLM fields, no `tmdbData`); then `Promise.allSettled` of poster lookups (each 10s timeout) → `itemPatch` per item in item order → `groupEnd`.
    *   `runPipelines`: optional `deriveProfile?: (content: UserContent) => Promise<string | null>`; memoized beside `loadPrefs` (one DB read, one profile call per run); absent/null → today's prompt + one warning log.
    *   `raceMerge`: try/finally forwarding `return()` to child generators (disconnect cancels lookups).
    *   Structured `RECO_DEBUG_LOG` line per run (env-gated): JSON with run id, output titles+years, patch outcomes, matcher excluded counts.

#### 9. `src/lib/data/preferences-server.ts` + `src/lib/data/preferences.ts` (Modify)

*   **Type / Scope**: Server data loading + shared type.
*   **Proposed Changes**: `UserContent` title entries gain optional `createdAt` and per-title `genres`; `loadUserContent` selects both (no migration — columns exist). Profile builder slices `createdAt desc` limit 100 and counts genres in memory.

#### 10. `src/routes/api/recommendations/stream.ts` (Modify)

*   **Type / Scope**: NDJSON stream route.
*   **Proposed Changes**: Supply `deriveProfile` (wraps `generateTasteProfile` + `renderProfileText`; fail-open → `null`). Thread `request.signal` into search calls. No `loadUserContent` call of its own (profile derives inside `runPipelines` from the memoized load).

#### 11. `src/lib/data/search.ts` (Modify)

*   **Type / Scope**: TMDB search functions.
*   **Proposed Changes**: `searchMoviesAPI`/`searchTVsAPI` accept an optional `AbortSignal`, passed through to `fetchFromTMDB`; `searchTitleWithYearFallback` forwards it and applies the 10s timeout when none given.

#### 12. `src/components/recommendations.tsx` (Modify)

*   **Type / Scope**: Stream consumer UI.
*   **Proposed Changes**: `buildPreviousWithIds` rewritten — drop the `tmdbData` filter and `id` extraction; send title+year+category for every shown item. `consumeStream` handles `itemPatch` (patch by key; ignore unknown). `STATUS_MESSAGES`/`isError` updated for the reduced status union.

#### 13. `src/components/recommendations/category-section.tsx` + `src/components/recommendation-card.tsx` (Modify)

*   **Type / Scope**: Types + card render.
*   **Proposed Changes**: Client `Recommendation` type (both copies): `tmdbData` optional. Card states: awaiting-patch skeleton; fallback on `filmInfo: null`; reaction buttons render only when `filmInfo` present (no-data cards non-interactive — accepted).

#### 14. `src/lib/data/recommendations.test.ts` (Modify)

*   **Type / Scope**: Contract suite.
*   **Proposed Changes**, per block: `happySequence` (L145-181) — updated: items without `tmdbData`, then `itemPatch` events in item order, `looking_up_posters` covers the patch phase, no retry progress; `enrichment_empty` test (L250-272) — rewritten: lookup miss yields item + `itemPatch {filmInfo: null}` + status `ok`; `exhausted` test (L274) — rebuilt on a title+year (not TMDB-id) collision producing fewer survivors, no retries; TMDB-carry/omit test (L317-339) — inverted per the new miss behavior. New cases: `deriveProfile` resolves → `getAIRecommendations` mock receives profile text; absent thunk → args identical to today; profile called exactly once across both categories.

#### 15. `src/components/recommendations.test.tsx` (Modify)

*   **Type / Scope**: Client suite.
*   **Proposed Changes**: item literals updated for optional `tmdbData`; `itemPatch` handling covered (patch applies, unknown key ignored); `buildPreviousWithIds` sends id-less payloads including failed-lookup items.

#### 16. `scripts/verify-titles.mjs` (Create)

*   **Type / Scope**: Dev-only offline script.
*   **Proposed Changes**: Parses `RECO_DEBUG_LOG` JSON lines; reports per-title patch outcome and the fake-title rate (no TMDB re-query). Run: `node scripts/verify-titles.mjs <logfile>`.

#### 17. `CONTEXT.md` (Modify)

*   **Type / Scope**: Architecture doc.
*   **Proposed Changes**: Vocabulary update: single-round overask replaces the deficit retry loop; poster lookup replaces the enrichment gate; `itemPatch` added to the stream-run description; exclusion is title+year+category matching.

### Verification Plan

*   **Baseline (before merge)**: record the current `enrichFail` rate from existing per-round logs (`recommendations.ts:347-349`) — the comparator for the fake-title rate.
*   **Types**: `npm run typecheck` (tsc --noEmit) — clean with optional `tmdbData`.
*   **Unit tests**: `npm test` (vitest run) — extended contract suites + matcher + profile + prompt-render tests; LLM-free via thunks/mocks.
*   **Manual R&D run**: author runs the reco page with `RECO_DEBUG_LOG=1`; confirms cards render before posters; runs `node scripts/verify-titles.mjs` with `TMDB_TOKEN` set; records the fake-title rate vs baseline and judges quality personally.
*   **Rollback check**: remove `deriveProfile` argument → prompt identical to today; branch revert removes title-first rendering and `itemPatch`.

--------------------------------------------------------------------------------

*Drafted with EGM*
