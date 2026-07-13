# Spec 0011: Preferences loading progress stage

## Prerequisite
Spec 0007 deployed (progress events, `StreamStage`, `groupStart.target`).
Spec 0006 deployed (NDJSON transport, server-authoritative prefs).

## Problem
The recommendation stream emits no event during the `loadUserContent()` DB
fetch — the user's prefs, people, and dislikes read. That fetch happens in the
route handler (`src/routes/api/recommendations/stream.ts:90`) before the stream
exists, occupying the pre-first-byte dead zone. The client renders static
skeletons with no status text during this window.

Spec 0007 added three pipeline-scoped stages (`finding_titles`,
`looking_up_posters`, `finalizing`) but deliberately excluded the pref-loading
phase — it wasn't inside the generator.

## Goal
Surface a `loading_preferences` stage over the wire so the client can show
"Loading your preferences" during the DB fetch. Move `loadUserContent` from the
route into the generator so the fetch occurs between the stage label and the
first LLM call — giving the stage honest timing.

## Decisions
- **New `StreamStage` value: `"loading_preferences"`** — maps to the
  `loadUserContent()` DB read (prefs, people, dislikes). Added to the existing
  union; not a new event variant.
  - `STAGE_LABELS["loading_preferences"]` = `"Loading your preferences"`.
  - `STAGE_COPY["loading_preferences"]` = `"Loading your preferences"`.
  (Copy adjustable; the key requirement is that both maps grow.)
- **Label-only render path in `computeProgress`.** The pref stage has no
  meaningful count (not "0 of 3"). `computeProgress` suppresses the
  `" · {found} of {target}"` suffix for stages in a countless set (initially
  `{ loading_preferences }`). Count-bearing stages render exactly as today.
- **Move `loadUserContent` into `backfillCategory`.** The route no longer
  `await`s `loadUserContent` before creating the stream. Instead it injects a
  `loadPrefs: () => Promise<UserContent>` into `runPipelines`. Each generator
  yields `progress{loading_preferences}` as its first event, THEN `await`s
  `loadPrefs()`, THEN builds `baseArgs`/`excludeIds` from the result.
- **Shared lazy promise (dedup), memoized in `runPipelines`.** `runPipelines`
  wraps the injected `loadPrefs` in a memoizing closure: first caller triggers
  the single `loadUserContent` call; second caller awaits the same in-flight
  promise. One DB round-trip regardless of category count.
- **`baseArgs`/`excludeIds` construction moves into the generator** (currently
  lines 422–446 in `runPipelines`). Each generator builds its own copy from the
  shared `userPrefs`. They're identical at construction time; divergence
  happens later as each category's `localExcludeIds` grows.
- **Emit ordering (guaranteed by `raceMerge` structure):**
  1. `raceMerge` yields `groupStart{category, target}` for every requested
     category up front (lines 341–343) — synchronously, before any generator's
     first `.next()`.
  2. Each generator's first yield is `progress{loading_preferences, found:0}`.
  3. Generator awaits shared `loadPrefs()`.
  4. After resolution: `progress{finding_titles}` → (existing 0007 flow).

  So the wire order per category is strictly: `groupStart` →
  `progress{loading_preferences}` → `progress{finding_titles}` → ...
- **`loadUserContent` throws on DB failure** (Spec 0011 AC9, revised).
  A successful read with zero rows returns a `UserContent` of empty arrays
  (legit new-user profile). A DB error — connection loss, malformed row —
  propagates as a thrown error. `loadPrefs()` rejects → the generator's
  existing `catch` emits `groupEnd{generation_failed}` → the stream
  terminates for that category instead of silently degrading with empty
  prefs. The UI surfaces the existing retry copy
  (`STATUS_MESSAGES.generation_failed`). The route loader
  (`getAllUserContent`) does not catch — a thrown error there propagates to
  TanStack Router's error boundary, rendering `RecommendationsError` with a
  "Try Again" button.
- **Backward compatibility: wire-safe.** An old client ignores the unknown
  `loading_preferences` stage value. The `progress` event variant and
  `groupStart.target` are unchanged from 0007. **Compile-time:** adding the
  stage forces `STAGE_LABELS`/`STAGE_COPY` (typed as
  `Record<StreamStage, string>`) to grow — clients importing those maps must
  add the entry or fail to compile. Intentional forcing function.

## Non-goals
- No surfacing of which DB tables are being read (prefs vs people vs dislikes)
  — one stage covers the whole `loadUserContent` call.
- No progress count or ETA for the pref stage (label-only).
- No change to `loadUserContent` internals, error handling, or the
  `EMPTY_USER_CONTENT` fallback.
- No change to `streamRequestSchema`, transport, or `item`/`groupEnd`
  semantics.
- No new `StreamEvent` variant — `loading_preferences` is a new `StreamStage`
  value carried by the existing `progress` event.

## Acceptance criteria
1. `StreamStage` includes `"loading_preferences"`.
2. `STAGE_LABELS` and `STAGE_COPY` each have an entry for
   `loading_preferences`.
3. `computeProgress` returns a label-only result (no `" · found of target"`
   suffix) for `loading_preferences`; count-bearing stages are unchanged.
4. The route (`src/routes/api/recommendations/stream.ts`) no longer `await`s
   `loadUserContent` before stream creation. It constructs a `loadPrefs` and
   passes it to `runPipelines`.
5. `runPipelines` receives `loadPrefs: () => Promise<UserContent>` instead of
   `userPrefs: UserContent`.
6. Each `backfillCategory` generator yields `progress{loading_preferences}` as
   its first event, before any `await`.
7. `loadUserContent` is called exactly once per stream regardless of how many
   categories are requested (shared lazy promise). Verified: a 2-category
   request triggers one `loadUserContent` call, not two.
8. For each requested category, the wire order is:
   `groupStart{category, target}` → `progress{loading_preferences}` →
   `progress{finding_titles}` → .... `groupStart` strictly precedes every
   `progress` event for that category.
9. If `loadUserContent` throws (DB failure), `loadPrefs()` rejects and the
   generator's existing `catch` emits `groupEnd{generation_failed}` for that
   category. The stream terminates — no silent degradation, no crash, no
   spurious `groupEnd` (exactly one per category). The UI shows the existing
   retry copy. A successful read with zero rows returns empty arrays and
   proceeds normally (legit new-user profile, not a failure).
10. Existing `item`/`groupEnd` semantics, ordering, counts, and the deficit
    loop are unchanged. `raceMerge` forwards `progress{loading_preferences}`
    transparently like any other `progress` event.
11. **Wire backward compatibility:** an unmodified pre-0011 client consuming
    the upgraded stream renders identically — `loading_preferences` is an
    unrecognized stage string; the old client's dispatch stores it in
    `categoryStage` harmlessly.

## Files
- `src/lib/data/stream-events.ts` (MODIFIED) — add `"loading_preferences"` to
  `StreamStage`; add entries to `STAGE_LABELS` and `STAGE_COPY`; modify
  `computeProgress` to suppress the count suffix for countless stages.
- `src/lib/data/recommendations.ts` (MODIFIED) — `runPipelines` signature:
  replace `userPrefs: UserContent` with `loadPrefs: () => Promise<UserContent>`;
  wrap in memoizing closure; pass to `backfillCategory`. `backfillCategory`
  signature: receive `loadPrefs` + `previousRecommendations` instead of
  `baseArgs` + `excludeIds`; yield `progress{loading_preferences}` first; then
  `await loadPrefs()`; then build `baseArgs`/`excludeIds` inline (code moved
  from `runPipelines` lines 422–446). The `progress` factory closure and all
  post-loading logic unchanged.
- `src/routes/api/recommendations/stream.ts` (MODIFIED) — remove
  `const userPrefs = await loadUserContent(...)` (line 90); construct
  `const loadPrefs = () => loadUserContent(session.user.id)`; pass `loadPrefs`
  to `runPipelines`.
- `specs/0007-recommendation-progress-events.md` (MODIFIED) — forward-reference
  note pointing here.
- `specs/0011-loading-preferences-stage.md` (NEW) — this spec.

## Independence check
- Builds on 0007's `progress` event variant and `StreamStage` type (no new wire
  variant).
- Does not touch `streamRequestSchema`, transport, client NDJSON reader, or the
  deficit loop.
- Client changes are contained to `stream-events.ts` (type + label maps +
  `computeProgress`). The client dispatch in `recommendations.tsx` already
  stores any `progress.stage` value generically (line 125) — no dispatch change
  needed.
- Deployable alone. Old clients ignore the new stage at runtime.

## Risks
- **Memoizing closure correctness.** The shared promise must be created once
  and reused. If `runPipelines` accidentally creates a new closure per
  generator, the fetch doubles. Mitigation: wrap at `runPipelines` scope, pass
  the same `loadPrefs` reference to every generator.
- **`baseArgs`/`excludeIds` duplication.** Each generator now builds its own
  copies from the shared `userPrefs`. They're identical at construction; memory
  cost is negligible (small arrays + a Set). The `localExcludeIds` copy at
  line 191 was already per-generator.
- **Stage ordering assumption.** The spec relies on `raceMerge` emitting all
  `groupStart`s (lines 341–343) before calling `gen.next()` on any generator
  (line 356). If a future refactor interleaves these, `progress` could precede
  `groupStart`. Acceptance criterion 8 codifies the invariant.
- **Compile-time break for downstream consumers.** Any code importing
  `STAGE_LABELS`/`STAGE_COPY` without the new entry fails to compile.
  Acceptable — it's a forcing function that ensures the new stage is rendered
  everywhere, not silently missing.
