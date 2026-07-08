# Spec 0006: Manual streaming transport (replace TanStack async-generator RPC)

## Prerequisite
Specs 0001–0005 deployed (ID filter, deficit loop, async-generator streaming,
parallel category streams, per-category prompt differentiation).

## Problem
The current transport is a TanStack Start async-generator server fn
(`getRecommendationsStream` yields `StreamEvent`s; client does
`for await (const evt of stream)`). TanStack Start's RPC framer emits one
JSON object per yielded value, but the client's chunked reader can receive
multiple frames glued in a single `read()` chunk. The deserializer then calls
`JSON.parse` per-chunk expecting exactly one object; when two frames land
together it throws `Invalid JSON line: {...}{...}` — "Unexpected
non-whitespace character after JSON" — and the `for await` loop dies
mid-stream.

Observed on main: server yielded 3 movie + 3 tv items (verified via
`[recommendations:*] groupEnd ... survivors=3` log lines + the per-round
`reject breakdown` diagnostic). Browser console logged 3 movie + 2 tv
`[client] item` events, then the parse error on the 3rd tv frame
(`{"t":32,...}{"t":32,...item "24: Live Another Day"...}`) — the trailing
tv item + its groupEnd were in the dropped tail. The client then rendered
3 movies + 2 tvs and zero tv skeletons (groupEnd never arrived, so tv stayed
pending → its own render branch failed).

This is a TanStack transport bug, not app logic:
- https://github.com/tanstack/router/issues/7345 (deserialization errors with
  async-generator server fns).
- https://github.com/tanstack/router/issues/6045 (streaming fn empty body).

The bug was latent through 0004/0005 because the over-ask buffer over-yielded
5+ items per side, so a truncated tail usually still met the 3-item target.
Spec 0005's exact cap fix (stop yielding past `TARGET_PER_CATEGORY`) made
every frame load-bearing and exposed the loss.

## Goal
Replace TanStack's async-generator RPC transport with a manual HTTP stream
that the app fully controls: server writes self-delimited records, client
reads the byte stream and parses each record independently. No dependency on
TanStack's chunk-boundary assumptions. Same `StreamEvent` contract, same
`groupStart`/`item`/`groupEnd` semantics, same client UX.

## Decisions
- **Wire format: newline-delimited JSON (NDJSON).** One `JSON.stringify(evt)`
  per line, `\n` separator. Self-delimiting, trivially splittable on any
  chunk boundary, debuggable with `curl`. Rejected alternatives:
  - Length-prefixed binary — overkill, harder to debug.
  - SSE — text/event-stream framing adds `data:` prefixes and `id:`/retry
    semantics we don't need; NDJSON is strictly simpler.
- **Transport: a plain route handler, not `createServerFn`.** Add a POST
  API route (e.g. `src/routes/api/recommendations/stream.ts` or the
  TanStack Start `createServerFn` returning a `Response` with a
  `ReadableStream` body — whichever the framework exposes for raw
  `Response` return). Body is a `ReadableStream` whose `enqueue` writes
  `JSON.stringify(evt) + "\n"`. Content-Type `application/x-ndjson;
  charset=utf-8`. `Cache-Control: no-store, no-transform` so proxies don't
  buffer.
- **Server body stays the same shape.** Keep `backfillCategory`,
  `raceMerge`, exclude-set build, deficit loop, ID filter, status
  classification — all of 0004's pipeline logic. Only the OUTER transport
  changes: instead of `yield`-ing from the server fn, the route handler
  owns a `ReadableStream` controller and writes each `StreamEvent` the
  generator yields via `controller.enqueue(encoder.encode(line))`.
  `raceMerge` stays an `AsyncGenerator<StreamEvent>` consumed by the
  handler's writer loop.
- **Client reader: manual.** Replace `for await (const evt of stream)`
  with a `fetch()` + `response.body.getReader()` loop that:
  1. decodes chunks with `TextDecoder`,
  2. buffers into a string split on `\n`,
  3. `JSON.parse`s each non-empty line into a `StreamEvent`,
  4. dispatches to the same handlers (groupStart/item/groupEnd) the
     current `for await` body already calls.
  No change to state machine, optimistic handlers, or render branches.
- **Abort support preserved.** `handleLoadMore` / unmount must still
  cancel. Pass an `AbortSignal` to `fetch`; on abort, the reader throws
  `AbortError` and the existing `catch (err) { if (err.name ===
  "AbortError") return; ... }` path runs unchanged.
- **`StreamEvent` type moves to a shared location** (or stays exported from
  `lib/data/recommendations.ts`) so the client imports it without pulling
  the server fn. The type is the contract; the transport is incidental.
- **`getRecommendationsStream` createServerFn is removed** once the route
  is live. The route handler builds `baseArgs`/`excludeIds` exactly as the
  current handler does (lift that code, don't duplicate logic — extract a
  pure `runPipelines(input): AsyncGenerator<StreamEvent>` helper that both
  the old fn and the new route can call during a transition, then drop the
  old fn).
- **No backpressure handling.** TMDB fan-out is bounded (≤MAX_ROUNDS ×
  OVERASK_BUFFER per side); the queue won't grow unbounded. If a future
  change makes yields faster than the network, revisit with
  `pull`-from-underlying-source semantics.

## Non-goals
- No change to the `StreamEvent` shape (groupStart/item/groupEnd, status
  codes, fields on `rec`).
- No change to `backfillCategory`, `raceMerge`, deficit math, ID filter,
  or status classification.
- No change to the client state machine, optimistic like/dislike, or
  skeleton render logic — only the read loop changes.
- No new auth surface. The route reads the session the same way
  `getAllUserContent` / other server fns do today (better-auth context).
- No SSE, no WebSockets, no length-prefixing.
- No retry/backoff on the read side (a dropped mid-stream record aborts
  the whole load; user hits Load More, same as today's throw path).

## Acceptance criteria
1. Server emits NDJSON: each `StreamEvent` is one JSON object followed by
   `\n`. `curl -N -X POST .../api/recommendations/stream` prints one event
   per line, parseable line-by-line with `jq -c .` per line.
2. Client renders exactly the events the server writes — given a server
   run that yields 3 movie + 3 tv items, the client logs 3 `[client] item
   movie` + 3 `[client] item tv` lines and renders 6 cards. No
   "Invalid JSON line" console error.
3. Two frames arriving in one `read()` chunk (simulate by throttling/
   concatenating in devtools or by adding a tiny server-side flush that
   batches 2 events per write) parse correctly: both events dispatch,
   no throw.
4. On abort (unmount mid-stream, or a second Load More while one is in
   flight), `fetch` rejects with `AbortError`; client swallows it via
   the existing catch; no unhandled rejection, no partial-card flicker
   beyond what the current async-generator path already shows.
5. On a category failure, the failing side's `groupEnd{status:
   generation_failed|exhausted|enrichment_empty}` still arrives and the
   error card renders; the survivor side keeps streaming to completion.
6. `groupStart` for both categories arrives before any `item` (skeletons
   render immediately), preserving 0004's first-card-latency guarantee.
7. No change to `src/lib/ai/recommendations.ts` (prompt layer) or to the
   input schema (`userPrefs`, `previousRecommendations`, requested counts).
8. The old `getRecommendationsStream` `createServerFn` and its import in
   `components/recommendations.tsx` are removed (not dead-coded).
9. `src/routes/recommendations.tsx` route + `pendingComponent` from the
   session-0 work stay unchanged.

## Files
- `src/routes/api/recommendations/stream.ts` (NEW) — POST handler
  returning a `Response` with a `ReadableStream<Uint8Array>` NDJSON body.
  Owns: input parse, session read, `baseArgs`/`excludeIds` build, drives
  `runPipelines` and writes each yielded `StreamEvent` as a NDJSON line.
- `src/lib/data/recommendations.ts` — extract `runPipelines(input):
  AsyncGenerator<StreamEvent>` (the current handler body minus
  `createServerFn`); keep `StreamEvent` export; remove
  `getRecommendationsStream` createServerFn. `backfillCategory`,
  `raceMerge`, `filterRecommendations`, `enrichRecommendationsWithTMDB`,
  tuning constants — unchanged.
- `src/components/recommendations.tsx` — replace
  `await getRecommendationsStream(...)` + `for await (const evt of stream)`
  with `fetch(ROUTE, { signal, method: "POST", body: JSON.stringify(input) })`
  + manual reader/decoder/buffer/split loop. Dispatch to the existing
  groupStart/item/groupEnd handlers. Remove `StreamEvent` cast-from-async-
  iterable; type each parsed line as `StreamEvent` after `JSON.parse`.
  Drop the `[client]` console logs added for diagnosis.
- `src/lib/ai/recommendations.ts` — no change (prompt layer).
- `src/routes/recommendations.tsx` — no change.
- `specs/0006-manual-stream-transport.md` — this spec.

## Independence check
- Reuses 0004's pipeline (backfillCategory, raceMerge, ID filter, status
  codes) and 0005's per-category prompt — both untouched.
- Without 0006: app works for the common case but silently drops tv items
  whenever two frames coalesce in one chunk. Latent, intermittent,
  impossible to repro deterministically. Already bit a real session.
- With 0006: deterministic parsing, no dependency on TanStack's framer,
  and a transport we can reason about end-to-end.
- No change to the LLM call shape, model fallback, deficit math, or
  status classification.

## Risks
- TanStack Start's way to register a raw-`Response` route (vs a
  `createServerFn`) must be confirmed against the installed version
  (`@tanstack/react-start@^1.139.8`). If a raw route isn't supported,
  fall back to a `createServerFn` that returns a `Response` wrapping a
  `ReadableStream` — same body, just wrapped. Confirm before implementing.
- Session/auth context on a raw route may differ from `createServerFn`'s
  implicit context. Verify the route can read the authenticated session
  the same way `getAllUserContent` does; if not, pass a session cookie
  explicitly or use better-auth's request-context helper.
- Manual reader must flush the final partial line on stream end (a chunk
  can split a line mid-`\n`). The buffer-split loop handles this; verify
  with a test that yields an event immediately before close.
- NDJSON over `fetch` isn't streamed-parsed by devtools nicely — add a
  `?pretty=1` dev-only mode (one object per indented line) only if it
  becomes a debugging blocker. Default stays compact.
- Backpressure: if the client is slow and the server yields faster than
  the socket drains, the `ReadableStream`'s internal queue grows. Bounded
  by pipeline output (≤ ~10–25 events/load); acceptable. Revisit if
  MAX_ROUNDS or OVERASK_BUFFER grow.
