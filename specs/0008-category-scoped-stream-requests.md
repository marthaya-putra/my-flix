# Spec 0008: Category-scoped stream requests

## Prerequisite
Spec 0007 deployed (progress events + `groupStart.target`). Sequenced after
0007 only to avoid merge conflicts in `src/lib/data/recommendations.ts`;
functionally independent of progress events.

## Problem
`runPipelines` (`src/lib/data/recommendations.ts:419-466`) always runs BOTH
the movie and TV pipelines. `handleLoadMore`
(`src/components/recommendations.tsx:224-234`) re-runs both in a single
stream call — there is no way to ask the server for one category alone. The
comment at `:222-223` even flags the oddity that both pipelines re-run on
every Load More.

With a sectioned UI (spec 0009) where Movies and TV are separate carousels,
the natural interaction is "load more movies" without disturbing a
satisfactory TV list. Today that is impossible — any Load More refreshes
both, re-running the TV LLM calls and TMDB lookups the user didn't ask for,
and resetting TV's pending/loading state unnecessarily.

## Goal
Let the client request a subset of categories so per-category Load More
works. A request for `{categories:["movie"]}` runs only the movie pipeline
and emits only movie events. Omitting `categories` preserves today's
"both" behavior exactly.

## Decisions
- **Add optional `categories?: ("movie" | "tv")[]` to `streamRequestSchema`**
  (`src/lib/data/recommendations.ts:403-412`). Default (omitted or empty
  array) = both categories. This is backward compatible: the current client
  sends only `{previousRecommendations}` (`src/components/recommendations.tsx:136`)
  and gets both, unchanged.
- **`runPipelines` runs `backfillCategory` only for requested categories.**
  Build the generator list conditionally: if `categories` is unspecified or
  empty, run both (current behavior); otherwise run only the listed ones.
  The shared `excludeIds` set is still built from the full liked/disliked/
  previous set — exclusions remain global because TMDB IDs are globally
  unique (spec 0001's invariant). Filtering the exclude set per category
  would be unsound.
- **`raceMerge` generalizes from exactly-two-generators to N (1 or 2).** The
  current implementation (`:354-397`) hardcodes `movieGen` + `tvGen` and
  emits both `groupStart`s up front. Generalize to a `reduce`/`Promise.race`
  loop over an array of tagged generators. Must preserve spec 0004's
  guarantees regardless of N:
  - `groupStart` for each running category fires before any of its `item`s.
  - `item` and `progress` events interleave as whichever generator resolves
    next (lowest first-card latency).
  - Exactly one `groupEnd` per running category, always, even on throw.
- **Events fire only for requested categories.** A movie-only request emits
  no `groupStart{tv}`, no `item{tv}`, no `progress{tv}`, no `groupEnd{tv}`.
  The client must not expect events for unrequested categories — and the
  current client already keys all state by `evt.category`, so a missing TV
  side simply leaves `categoryStatus.tv` at its prior value (acceptable; the
  UI doesn't reset a category it didn't ask to refresh).
- **Validation:** `categories` is a `z.array(z.enum(["movie","tv"]))`. An
  invalid enum value (e.g. `"films"`) is rejected by zod at
  `streamRequestSchema.safeParse` → 400, same as any other schema violation
  (`stream.ts:77-83`). Duplicates (e.g. `["movie","movie"]`) are tolerated
  (dedupe in `runPipelines`) — not worth a dedicated zod refinement.

## Non-goals
- No client UI for per-category Load More buttons (Spec 0009 owns the UI).
- No change to the exclude-set semantics (still shared/global across whatever
  categories run).
- No change to `previousRecommendations` handling (still filters the running
  category's exclude set and feeds the next round's prompt).
- No change to the deficit loop, model fallback, or status classification.
- No partial-category support (a request is all-or-nothing per category —
  you either run movie or you don't).

## Acceptance criteria
1. `streamRequestSchema` accepts an optional `categories` array of
   `"movie" | "tv"`.
2. A request `{categories:["movie"], previousRecommendations:[...]}` emits
   movie `groupStart`, movie `item`s, movie `progress`, and exactly one
   movie `groupEnd` — and NO tv events of any type.
3. **Backward compatibility:** a request omitting `categories` (the current
   client payload shape) behaves exactly as today — both categories run, all
   events for both fire, identical ordering and counts.
4. A request with an invalid category string (e.g. `"films"`) returns HTTP
   400 via zod rejection (same path as any schema violation).
5. `previousRecommendations` still correctly seeds the exclude set and the
   "Already recommended" prompt section for whichever categories run —
   loading more movies with a full previous-movie list excludes those IDs.
6. **Standalone-safe:** deploying 0008 without 0007 — the current client
   sends no `categories`, server defaults to both, behavior is identical to
   pre-0008. No regression.
7. With 0007 also deployed, a category-scoped request still emits `progress`
   events (with `target` on `groupStart`) for the running category only.
8. `raceMerge` with a single generator still emits that category's
   `groupStart` up front, forwards its events, and emits its `groupEnd`
   exactly once — preserving the 0004 guarantees at N=1.

## Files
- `src/lib/data/recommendations.ts` (MODIFIED) — add `categories` to
  `streamRequestSchema`; thread `categories` into `runPipelines` and
  conditionally build the generator array; generalize `raceMerge` from
  two-hardcoded-generators to N. `backfillCategory` itself is unchanged (it
  already yields per-category; it just may be instantiated fewer times).
- `specs/0008-category-scoped-stream-requests.md` (NEW) — this spec.

## Independence check
- Reuses spec 0007's `stream-events.ts` contract (same event variants, same
  `groupStart.target`).
- Owns `streamRequestSchema` and `runPipelines` category-selection logic.
  Does NOT touch the client (spec 0009 owns all client payload + UI changes).
- **Shared file risk with 0007:** both modify `src/lib/data/recommendations.ts`.
  0007 touches `backfillCategory` + `raceMerge`; 0008 touches
  `streamRequestSchema` + `runPipelines` + `raceMerge`. The `raceMerge`
  overlap is why 0008 is sequenced after 0007 — implement 0007 first, then
  0008 generalizes the already-progress-aware `raceMerge` to N generators.
- **Deployable alone (functionally).** Without 0007, category scoping still
  works — just without progress events. Without 0009, no UI exposes the
  capability, but the API is live and testable via `curl`.
- Sequencing is a merge-conflict avoidance convention, not a functional
  dependency.

## Risks
- **`raceMerge` generalization correctness.** The current two-generator
  `Promise.race` loop (`:361-396`) tracks `movieDone`/`tvDone` booleans and
  re-arms only the not-done side. Generalizing to N must track done-state
  per generator (an array or map) and stop when all are done. A bug here
  could drop a trailing `groupEnd` or hang the stream waiting for a
  completed generator. Mitigation: the 0004 guarantees (exactly one
  `groupEnd` per category, always) are the acceptance test — assert them
  for N=1 and N=2.
- **Empty `categories` array semantics.** `[]` must mean "both" (same as
  omitted), NOT "run nothing" (which would emit no events and look like a
  hang). Explicitly treat `undefined` and `[]` identically in `runPipelines`.
  Document this; a future caller sending `[]` expecting "nothing" would be
  surprised.
- **Client state on scoped load.** When the client later (0009) loads only
  movies, `categoryStatus.tv` is untouched. The UI must not interpret "no tv
  events this load" as "tv failed" — it should leave tv at its prior settled
  state. This is a client concern (0009) but the backend contract (no tv
  events for a movie-only request) makes it possible.
