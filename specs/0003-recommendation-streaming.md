# Spec 0003: Per-item streaming via async generator

## Prerequisite
Specs 0001 + 0002 deployed (ID filter + deficit loop exist).

## Problem
Spec 0002 streams survivors per-round (batch append when a round resolves). Within
a round, all N cards appear together only after the slowest TMDB lookup finishes.
The user waits on the slowest item before seeing any of that round.

## Goal
Stream each survivor to the client the instant its TMDB enrichment + filter check
completes — true per-card reveal, card by card, from the very first card.

## Background
TanStack Start v1.139 supports streaming from `createServerFn` via async
generators (`async function*`) or `ReadableStream<T>`. Client consumes via
`for await`. Verified against official streaming guide:
https://tanstack.com/start/latest/docs/framework/react/guide/streaming-data-from-server-functions

## Decisions
- Server fn `getRecommendationsStream` = async generator. Iterates LLM output,
  enriches each item, runs the 0001 filter (`tmdbData` null-check + exclude-ID
  check) per-item, and `yield`s each survivor immediately.
- AI call itself stays a single batch `generateObject` (the LLM returns all N at
  once); only enrichment/filter/reveal is per-item. Rationale: cannot stream
  `generateObject` partials reliably, and the latency win is in TMDB enrichment
  fan-out, not the LLM call.
- Client consumes via `for await`, appends each survivor with
  `setRecommendations(prev => [...prev, survivor])` — per-item, not per-round.
- Deficit loop (Spec 0002) stays client-orchestrated. Each round now streams its
  items one at a time instead of as a batch.
- Round 1 reveal: client-triggered. Loader returns `userPrefs` only (no recs);
  client starts the round-1 stream on mount. Grid shows skeleton/spinner, cards
  pop in as TMDB lookups resolve. Trades SSR'd first paint of recs for true
  per-item reveal from card 1.

## Non-goals
- No streaming the LLM token output (out of scope; latency win is enrichment).
- No new DB table, no previous-shown persistence (still deferred).
- No SSE transport (async generator is the transport).

## Acceptance criteria
1. On load, cards appear one at a time as their TMDB lookups resolve, not as a
   batch of 6 after the slowest finishes.
2. The first clean survivor renders before the last one resolves.
3. Survivors still obey the 0001 filter (no liked/disliked/null) and 0002 loop
   (backfill to 6, cap 3, 3/3 preserved, LoadMore gating intact).
4. Loader no longer awaits recommendations — returns `userPrefs` only. Route's
   Suspense boundary covers the initial skeleton, not a rec array.
5. Round-1 stream is triggered from a client `useEffect` on mount.
6. Aborting navigation mid-stream does not crash (cancelled iteration handled).

## Files
- `src/lib/data/recommendations.ts` — new `getRecommendationsStream` async
  generator server fn. Reuses 0001's filter logic per-item. Keeps the existing
  batch `getRecommendations` for any non-streaming caller (or removes it if
  unused after migration — confirm during impl).
- `src/components/recommendations.tsx` — replace batch `getRecommendations`
  calls (round 1 on mount, rounds 2-3 in loop, LoadMore) with
  `getRecommendationsStream` + `for await` per-item append.
- `src/routes/recommendations.tsx` — loader returns `userPrefs` only; drop the
  awaited `getRecommendations` promise from the loader return.

## Independence check
- Depends on 0001 + 0002. Builds on their filter + loop.
- Without 0003: app works, bug fixed, backfill works — just batch-per-round
  reveal (Spec 0002 state).
- With 0003: per-card reveal, loader simplified. No rewrite of filter or loop.

## Risks
- Loader change removes SSR'd recs → first paint shows skeleton instead of cards.
  Accepted per decision (Q: "client-triggered stream, full streaming from first card").
- Async-generator streaming in TanStack Start has known deployment caveats
  (empty body on some hosts, abort-signal edge cases — see GitHub issues #6045,
  #4651). Test against the project's actual deploy target before shipping.
