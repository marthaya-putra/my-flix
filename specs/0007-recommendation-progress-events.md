# Spec 0007: Recommendation progress events

## Prerequisite
Spec 0006 deployed (manual NDJSON transport, `groupStart`/`item`/`groupEnd`
sentinel protocol, server-authoritative prefs).

> **Amended by [Spec 0011](./0011-loading-preferences-stage.md):**
> `StreamStage` gains a fourth value `loading_preferences` (pref DB fetch);
> `runPipelines`' `userPrefs` arg becomes `loadPrefs: () => Promise<UserContent>`;
> `computeProgress` gains a label-only render path for countless stages.

## Problem
The stream protocol (`src/lib/data/stream-events.ts:18-36`) carries only
three event variants. `groupStart` has no target count, so the client cannot
compute "2 of 3." Rich progress data — round number, survivor count, pipeline
stage — exists server-side but is emitted exclusively via `console.log`
(`src/lib/data/recommendations.ts:192-193`, `:208-210`, `:228-230`,
`:313-315`, `:331-333`). None of it crosses the wire.

Observed UX: while a recommendation load is in flight, the only feedback is
N skeleton card placeholders per side (`src/components/recommendations.tsx:440-447`)
with no status text, no stage label, no count, no ETA. On a slow LLM round or
a slow TMDB enrichment, the user stares at static shimmer blocks with zero
signal that anything is progressing. Boredom + perceived hang risk.

The information to fix this already exists in the pipeline. It just never
leaves the server.

## Goal
Surface human-readable pipeline stage + live survivor count over the wire so
the client can render meaningful progress feedback. Server stays the single
source of truth (consistent with spec 0006's server-authoritative stance).
No client changes in this spec — the client ignores the new events until
spec 0009 consumes them.

## Decisions
- **New `StreamStage` type** = `"finding_titles" | "looking_up_posters" |
  "finalizing"`. Three user-meaningful stages mapping to internal pipeline
  phases. *(Spec 0011 adds `"loading_preferences"` as a fourth stage and moves
  the pref fetch into the generator; see that spec.)*
  - `finding_titles` — the LLM model-fallback chain is running
    (`backfillCategory` lines `:206-237`).
  - `looking_up_posters` — the TMDB enrichment fan-out is running
    (`:258-312`).
  - `finalizing` — the per-round reject breakdown + terminal status
    classification before `groupEnd` (`:313-334`).
  Rejected: exposing model names (`google`/`mistral`), round numbers
  (`1/5`), or reject counts (`excluded`/`enrichFail`/`capped`) — too
  granular and jargon-laden for end users. They stay in `console.log`.
- **New `StreamEvent` variant: `{ type: "progress"; category: StreamCategory;
  stage: StreamStage; found: number }`.** `found` = `totalSurvivors` at emit
  time, server-authoritative. This is the 4th variant alongside the existing
  three; the protocol grows by one sentinel, not a combinatorial explosion
  of typed sub-events.
- **Enrich `groupStart` with `target: number`** (=
  `TARGET_PER_CATEGORY`, currently 3). The client cannot otherwise know the
  goal count — that constant lives only server-side
  (`src/lib/data/recommendations.ts:21` and mirrored at
  `src/components/recommendations.tsx:25`). Making it a wire field means the
  client never hard-codes or guesses it.
- **Emit points in `backfillCategory`:**
  1. Yield `progress{finding_titles}` before the model-fallback chain each
     round (`:~211`, after the `ask` computation).
  2. Yield `progress{looking_up_posters}` before the TMDB enrichment fan-out
     (`:~258`, after `raw` is confirmed non-empty).
  3. Re-yield `progress` with the updated `found` after each surviving item
     yield (`:311`), so the count ticks live as items land — NOT just on
     stage change. This is what makes progress feel alive during a long
     enrichment.
  4. Yield `progress{finalizing}` once before terminal status classification
     (`:~318`).
- **Cadence: stage transitions + per-survivor found increments.** Rejected: a
  periodic heartbeat timer (e.g. emit `progress` every 2s regardless of
  change). The per-item tick already signals liveness during the slowest
  phase (TMDB enrichment); a heartbeat adds cadence complexity and more
  events for marginal gain.
- **Multi-round degradation is honest.** When the deficit loop cycles (enrich
  failures or excluded titles force round 2+), the stage label legitimately
  returns to `finding_titles` for each new round. Rejected: a monotonic
  single-forward label that would say `looking_up_posters` during an
  internal re-generation round — lagging reality and misleading. The user
  seeing the label step back briefly is truthful.
- **`raceMerge` forwards `progress` events transparently**, like `item`
  events — whichever category's generator yields next gets forwarded to the
  stream. No reordering, no coalescing.
- **Backward compatibility is a hard requirement.** The client dispatch in
  `src/components/recommendations.tsx:104-127` is an if/else-if chain with
  no `else`/throw. A new `progress` event type hits no branch and is silently
  ignored. The added `target` field on `groupStart` is ignored (client reads
  only `evt.category`). An unmodified client consuming the upgraded stream
  must keep working identically. Do NOT introduce exhaustive `switch` on the
  client that would throw on unknown types — preserve forward compatibility
  for future event additions.

## Non-goals
- No client/UI rendering of progress (Spec 0009).
- No category-scoped stream requests / per-category Load More (Spec 0008).
- No surfacing model names, round numbers, or reject breakdowns over the wire
  (stays `console.log`-only; too fine for end users).
- No change to `item`/`groupEnd` semantics, status codes, or the deficit loop.
- No change to `streamRequestSchema` or transport (spec 0006 unchanged).
- No heartbeat / liveness timer.

## Acceptance criteria
1. `StreamStage` type is exported from `src/lib/data/stream-events.ts`.
2. `StreamEvent` union includes the `progress` variant with `category`,
   `stage`, `found` fields.
3. `groupStart` carries a `target: number` field.
4. Each category emits at least one `progress{finding_titles}` before its
   first LLM call of each round.
5. `progress{looking_up_posters}` is emitted before the TMDB fan-out each
   round.
6. `progress.found` increments by exactly 1 per surviving item yield — for
   a category that produces N survivors, the sequence of `progress.found`
   values is monotonic from 0 to N, and the final value equals the count of
   `item` events for that category.
7. `progress{finalizing}` is emitted exactly once per category before its
   `groupEnd`.
8. Existing `item`/`groupEnd` semantics, ordering, and count are unchanged;
   `raceMerge` forwards `progress` events alongside `item` events.
9. **Backward compatibility:** an unmodified client (pre-0007) consuming the
   upgraded stream renders identically to today — `progress` events are
   silently ignored by the dispatch fall-through, `groupStart.target` is
   ignored (only `category` is read). No client error, no crash, no behavior
   change. Verified by running the current client against the upgraded
   server.
10. The stream fatal-fallback path (`src/routes/api/recommendations/stream.ts:103-125`)
    still emits clean terminal `groupEnd`s for both categories; progress
    events are not required on that error path.

## Files
- `src/lib/data/stream-events.ts` (MODIFIED) — add `StreamStage` type; add
  the `progress` variant to the `StreamEvent` union; add `target: number` to
  the `groupStart` variant. Owns: the wire contract only.
- `src/lib/data/recommendations.ts` (MODIFIED) — yield `progress` events
  from `backfillCategory` at the four emit points; thread `target`
  (`TARGET_PER_CATEGORY`) into the `groupStart` emission in `raceMerge`
  (`:358-359`) — either by passing `target` as a `raceMerge` parameter or by
  moving the two `groupStart` emissions into `backfillCategory` (prefer the
  lower-diff param-threading option unless readability suffers).
  `runPipelines` (`:419`), `streamRequestSchema` (`:403`), and the exclude
  set build are unchanged.
- `specs/0007-recommendation-progress-events.md` (NEW) — this spec.

## Independence check
- Reuses spec 0006's NDJSON transport unchanged (same route, same reader,
  same `"\n"` framing — only more event types flow over it).
- Touches `backfillCategory` and `raceMerge` only. Does NOT touch
  `streamRequestSchema` or `runPipelines` category-selection logic (that is
  spec 0008's concern — sequenced to avoid merge conflicts in the same file).
- Does NOT touch any client file (spec 0009 owns all client changes).
- **Deployable alone.** An unmodified client ignores the new events and the
  new field; the app behaves exactly as before. Safe to ship 0007 without
  0008 or 0009.
- Without 0007: specs 0008 and 0009 are not blocked on each other's
  *content*, but 0009's progress UI cannot function — it has no stage/count
  data to render.

## Risks
- **`groupStart` emission point.** Currently `raceMerge` emits both
  `groupStart`s up front (`:358-359`) so the client can render skeletons
  immediately. Threading `target` requires either (a) passing it as a
  `raceMerge` param, or (b) moving `groupStart` into `backfillCategory`.
  Option (a) is lower-diff and preserves the up-front ordering guarantee;
  prefer it. Option (b) risks reordering if generators don't both yield
  `groupStart` before their first `item`.
- **Per-item `progress` event volume.** Worst case (both categories hit
  MAX_ROUNDS=5 with full survivor counts) adds up to ~2×30 extra events per
  load. Negligible against the existing NDJSON budget; no backpressure concern
  (spec 0006 already established the queue is bounded).
- **`found` vs client-counted reconciliation.** The client will later (0009)
  also count `item` events locally. Server `progress.found` and the local
  count must agree. They will, by construction (found is emitted immediately
  after each item yield, in order). Document this invariant so 0009 doesn't
  "smooth" or second-guess the server value.
