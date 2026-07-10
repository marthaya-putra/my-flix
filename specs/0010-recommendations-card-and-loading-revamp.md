# Spec 0010: Recommendations card redesign + loading revamp

## Prerequisite
Spec 0009 (sectioned carousels with live progress) shipped. This spec
**supersedes** several of 0009's decisions (see "Supersedes" below) and
preserves its transport (specs 0006/0007/0008 — NDJSON, progress events,
category-scoped requests).

## Problem
The 0009 redesign works but has three UX defects the user flagged:

1. **Blank initial carousel.** Spec 0009 removed skeletons and made the live
   header the only loading affordance. Result: while a category streams with
   0 items, the carousel slot is an empty 280px void and the header strip
   ("Finding titles · 0 of 3") is too weak to signal anything is happening.
2. **Weak load-more feedback.** Load-more is a separate outline button below
   the carousel whose only feedback is a text flip ("Load more" → "Loading…").
   Existing cards don't change; the strip is the only signal. Not obvious.
3. **Card is cramped.** `RecommendationCard`
   (`src/components/recommendation-card.tsx`) is a **wide** card (poster-left
   + details side-by-side) dropped into a `lg:basis-1/3` carousel slot.
   Title, "Watch Now", thumbs up/down, a multi-line reason, and a tmdb-warning
   all compete for ~1/3 of the viewport width. It reads cramped and is not
   carousel-native.

## Goal
Replace the wide card with a **poster-first card** (Option 1: card IS the
2:3 poster, reason + actions revealed on hover/expand), give the initial
load a real in-slot loading composition, and move load-more into the
carousel itself as a trailing card that owns its own progress feedback.

## Decisions

### Card: poster-first overlay (Option 1)
- **Card IS the portrait poster (aspect 2:3).** The `<img>` fills the card
  (`object-cover`); no separate details column. This replaces the wide
  `RecommendationCard` layout (`src/components/recommendation-card.tsx:38-155`).
- **At rest (idle), the card shows only:** poster, title (on a bottom
  gradient strip), rating badge (top-left), and year+category badges
  (top-right). Nothing else.
- **On hover (desktop pointer), the card scales up slightly and reveals an
  overlay panel** covering the poster: title + rating + year/category, the
  full AI reason (clamped to ~4 lines, `reason-clamp-4` style), and the
  action row — Watch (▶, primary), thumbs up, thumbs down. The hover panel
  is the ONLY place the reason and actions live.
- **On touch (no hover), tap expands the overlay panel in-place; a second
  tap (backdrop or explicit close) collapses it.** Embla distinguishes tap
  from drag by movement threshold, so swipe still scrolls the carousel and
  tap expands the card. One card may be expanded at a time per carousel
  (expanding another collapses the prior).
- **Carousel item basis is unchanged:** `basis-full sm:basis-1/2 lg:basis-1/3`
  (`recommendation-carousel.tsx:84`). Embla `dragFree: true` is preserved.
- **"No poster" fallback** stays as an in-card placeholder (the 🎬 block,
  `recommendation-card.tsx:51-56`) sized to the full 2:3 card.
- **tmdb-null warning** (`recommendation-card.tsx:149-153`) is folded into
  the overlay panel (a small inline note), not a separate block — the card
  has no room for a standalone warning strip.

### Supersedes spec 0009
This spec **supersedes** the following 0009 decisions:
- **"Keep the existing wide RecommendationCard"** (0009 line 55-58,
  Decisions §Card; also Non-goals "No RecommendationCard content
  redesign"). → Replaced by the poster-first card above. The "reason
  always visible at a glance" rationale is explicitly traded away for a
  denser, carousel-native card; reason discoverability moves to hover/tap.
- **"Skeletons are removed"** (0009 Decisions §Skeletons; Acceptance #3).
  → Partially reversed: the initial-load 0-items gap now uses an in-slot
  composition (see below). Skeletons per se do NOT return as card
  placeholders; the composition is a centered loader, not shimmer cards.
- **"Per-category Load More button" rendered below the carousel** (0009
  Decisions §Load More; Acceptance #6; `category-section.tsx:106-119`).
  → Replaced by the trailing load-more card (see below). The standalone
  button below the carousel is removed.
- **"Slide-to-latest" auto-scroll to the last slide** (0009 Decisions
  §Slide-to-latest; Acceptance #7). → Replaced by "scroll to first new
  card" (see below).

### Initial-load state (0 items, `pending`)
- **Centered composition fills the carousel slot.** When a category is
  `pending` AND has 0 rendered items, the carousel slot
  (`category-section.tsx:85`, the `min-h-[280px]` container) renders a
  centered loader instead of an empty Embla viewport: a spinner, the
  human-readable stage label, the `found of target` count, and the
  animated fill bar (same bar style as
  `live-progress-header.tsx:54-59`).
- Source of truth is the server `progress.found` + `groupStart.target`
  (spec 0007 invariant). Before the first `progress` event (no stage/
  target/found yet), the composition shows the spinner + "Loading…"
  (mirrors `live-progress-header.tsx:30-39`).

### Mid-stream header (≥1 item, `pending`)
- **The instant the first card arrives, the centered composition is gone
  for good for that load.** The carousel shows real cards streaming in.
- **The header above the carousel keeps showing progress** (stage label +
  `found of target` + fill bar) until `groupEnd`. This is the existing
  `LiveProgressHeader` pending branch
  (`live-progress-header.tsx:44-61`) — keep it as-is.
- **On `groupEnd{ok}`, the header collapses to "Movies · N picks"**
  (`live-progress-header.tsx:65-69`) — unchanged.
- Net: progress has exactly one home per phase —
  0-items-pending → in-slot composition; ≥1-item-pending → header; settled
  → collapsed header.

### Load-more as a trailing carousel card
- **The trailing load-more card is always the LAST item in the carousel
  whenever the category has ≥1 real card** (i.e. append one extra
  `CarouselItem` after the mapped recommendation cards). It is a real
  slide in the Embla list, so the user encounters it by arrowing/dragging
  to the tail — exactly "render the load more button as an extra card,
  hidden unless user presses next arrow."
- **Hidden while 0 real items.** When the category has 0 real cards
  (initial load, or a load-more on an empty category), the trailing card
  is NOT rendered — the in-slot centered composition owns that state.
  Avoids two competing loading affordances in one carousel.
- **Idle appearance:** a 2:3 card matching the poster card's shape, styled
  as a call-to-action (e.g. a "+" or "Load more" label on a muted
  surface) so it reads as an action, not content.
- **Clicking it triggers the category-scoped stream** (spec 0008
  `categories:[cat]`, existing `handleCategoryLoadMore` at
  `recommendations.tsx:228-246`).
- **While loading, ALL progress lives INSIDE the trailing card** — this is
  the headline behavior. The header above stays in its **settled** form
  ("Movies · N picks") for the whole load-more; it does NOT switch back to
  pending. The trailing card itself shows: the stage label, `found of
  target`, the animated fill bar, and a spinner. The card is the one and
  only place load-more progress is communicated. (This means
  `loadingMore` and `pending` must render differently for the header — see
  "State machine" below.)
- **As new `item` events arrive during load-more**, they stream in
  BEHIND the trailing card (the trailing card stays last). The header's
  `count` increments (it reads `items.length`), but its visual form does
  not change from settled.
- **On load-more resolve,** auto-scroll to the **first new card** (the
  slide immediately after the old tail), not to the last slide. The
  trailing card naturally pushes one position further right, out of view.
  Implement via the Embla `CarouselApi`: capture `previousTailIndex =
  items.length` before append, then after React commits + `api.reInit()`,
  `api.scrollTo(previousTailIndex)`.

### State machine (client)
- Per category, track: `status` (`pending|ok|error`), `stage`, `found`,
  `target`, `errorMessage`, plus a separate `loadingMore: boolean`
  (already exists, `recommendations.tsx:28`) — but it must become
  **per-category** (today it's a single shared boolean; two categories
  can't load-more simultaneously, which is fine, but the trailing-card
  progress needs to know WHICH category is loading).
- Header render rule:
  - `status === "pending"` (initial stream, NOT load-more) → pending
    branch (stage/found/target/bar, or "Loading…" pre-first-progress).
  - `loadingMore[cat] === true` → **settled** form ("Movies · N picks"),
    even though a stream is in flight. Progress is in the trailing card.
  - `status === "ok"` → settled form.
  - `status === "error"` with 0 items → error card (unchanged).
- The `dispatch` for `progress`/`groupStart`/`groupEnd` events must write
  stage/found/target into a slot that the **trailing card** reads during
  load-more, and that the **header** reads during initial load. Simplest:
  keep the existing per-category `stage/found/target` state; both
  consumers read the same values — the difference is only WHICH component
  renders them, gated by `loadingMore`.

### Load-more flow specifics
- `handleCategoryLoadMore(cat)` snapshots `previousTailIndex = recs[cat].length`
  before calling `consumeStream`, sets `loadingMore[cat] = true`, then on
  resolve sets `loadingMore[cat] = false` and, if the count grew, triggers
  the scroll-to-first-new-card effect (replaces the current
  `scrollToLatest` increment at `recommendations.tsx:242`).
- The `consumeStream` call still resets the category to `pending`
  internally (`recommendations.tsx` resets requested categories). During
  load-more we must NOT let that pending flip the header to its pending
  branch — gate the header on `!loadingMore[cat] && status === "pending"`.
  Alternatively, during load-more the per-category `status` stays `ok`
  and only `loadingMore` flips; the stream's `groupStart`/`progress`/
  `groupEnd` update stage/found/target + a per-category `loadMoreError`,
  leaving `status` untouched. **Preferred: do not flip `status` during
  load-more** — keep `status` as the initial-stream lifecycle only, and
  drive load-more purely through `loadingMore` + the existing stage/found/
  target fields. This keeps the two loading modes cleanly separated and
  is the key enabler for "progress lives in the trailing card."

## Non-goals
- No backend changes (consumes specs 0007/0008 as-is).
- No new dependencies (Embla + existing primitives suffice).
- No change to optimistic like/dislike, image-error handling, or
  `AbortController` cancellation (`recommendations.tsx:99-100,190`).
- No infinite scroll (the trailing card is an explicit click-to-load, not
  an intersection observer).
- No persistence of carousel scroll position or expanded-card state.
- No desktop click-to-expand (desktop uses hover; only touch uses tap).
- No ADR for the poster-first card on its own — the supersession notes
  above record the trade-off inline. (If you'd prefer a standalone ADR,
  say so; per the domain-modeling rule it's borderline-reversible since
  it's a client-only visual change.)

## Acceptance criteria

### Card
1. `RecommendationCard` renders as a 2:3 portrait poster card. At rest it
   shows only poster + title (bottom gradient) + rating/year/category
   badges. The wide poster-left/details-right layout is gone.
2. On desktop hover, the card reveals an overlay with the full AI reason
   (clamped) + Watch + thumbs up/down. The reason and actions exist ONLY
   in this overlay (and the touch expanded state).
3. On touch, tap expands the overlay in-place; a second tap collapses it.
   Swipe (drag) still scrolls the carousel — tap does not both expand and
   drag. At most one card is expanded per carousel at a time.
4. The tmdb-null case renders an inline note inside the overlay (no
   standalone amber block), and the no-poster case renders the 🎬
   placeholder at the full 2:3 size.

### Initial load
5. When a category is `pending` with 0 rendered items, the carousel slot
   shows a centered composition: spinner + stage label + `found of target`
   + fill bar (driven by `progress.found` + `groupStart.target`). The slot
   is never a blank void.
6. The instant the first card arrives, the centered composition is
   replaced by the live carousel of real cards for the rest of that load.

### Mid-stream + header
7. While `pending` with ≥1 item, the header above the carousel shows
   stage + `found of target` + fill bar (unchanged `LiveProgressHeader`
   pending branch).
8. On `groupEnd{ok}`, the header collapses to "Movies · N picks".

### Load-more
9. The standalone "Load more" button below the carousel is gone. A
   trailing load-more card is rendered as the last carousel item whenever
   the category has ≥1 real card.
10. The trailing card is hidden while the category has 0 real items.
11. Clicking the trailing card triggers the category-scoped stream
    (`categories:[cat]`). The other category is untouched.
12. While load-more is in flight, ALL progress (stage + `found of target`
    + bar + spinner) renders INSIDE the trailing card. The header above
    stays in its settled ("· N picks") form — it does NOT switch to
    pending. New `item`s stream in behind the trailing card.
13. On load-more resolve, the carousel auto-scrolls to the first new card
    (the slide after the old tail), not to the last slide.
14. A load-more error renders inside/around the trailing card (e.g. the
    card shows the error + a retry affordance), scoped to that category.

### Robustness
15. The `AbortController` unmount/load-more cancellation still works —
    navigating away or starting a new load aborts the in-flight stream.
16. The `inFlight` StrictMode dedupe still prevents double-firing the
    initial stream on mount.
17. `loadingMore` is tracked per-category (or otherwise disambiguated) so
    the trailing-card progress reads the right category's stage/found.

## Files
- `src/components/recommendation-card.tsx` (MODIFIED, major) — replace
  the wide layout with the poster-first card: poster-fills-card, bottom
  gradient title, badges, hover/tap overlay (reason + actions + tmdb
  note). Owns: card visual + expand interaction.
- `src/components/recommendations/category-section.tsx` (MODIFIED) —
  render the centered composition in the slot when 0-items-pending;
  append the trailing load-more card as the last `CarouselItem` when
  ≥1 item; remove the standalone Load-more button block (`:106-119`).
  Owns: which slot state + trailing card presence.
- `src/components/recommendations/recommendation-carousel.tsx`
  (MODIFIED) — change `scrollToLatest` semantics to "scroll to first new
  card" (accept a target index, not always-last); keep `reInit` +
  `CarouselApi`. Owns: carousel mechanics + scroll-to-first-new.
- `src/components/recommendations/live-progress-header.tsx` (MODIFIED,
  small) — do NOT enter the pending branch while `loadingMore` is true;
  stay settled. Accept a `forceSettled?: boolean` (or read `loadingMore`)
  prop. Owns: header visual gating.
- `src/components/recommendations/initial-load-composition.tsx` (NEW) —
  the centered in-slot loader (spinner + stage + found/target + bar) for
  the 0-items-pending gap. Owns: the initial-load progress visual.
- `src/components/recommendations/load-more-card.tsx` (NEW) — the
  trailing 2:3 card; idle CTA state + in-flight progress state (stage +
  found/target + bar + spinner) + error/retry state. Owns: load-more
  affordance + its progress visualization.
- `src/components/recommendations.tsx` (MODIFIED) — per-category
  `loadingMore`; `handleCategoryLoadMore` snapshots `previousTailIndex`
  and drives scroll-to-first-new; during load-more do NOT flip `status`
  to pending (keep `status` = initial-stream lifecycle; drive load-more
  through `loadingMore` + stage/found/target). Owns: state machine +
  data flow.
- `specs/0010-recommendations-card-and-loading-revamp.md` (NEW) — this
  spec.

## Independence check
- Consumes specs 0006/0007/0008 (NDJSON, progress, category scope) — no
  backend overlap.
- Supersedes parts of 0009 (card shape, skeletons, load-more UI,
  slide-to-latest) — all client-side, no protocol change.
- No new dependencies; reuses Embla + existing `ui/carousel`, `ui/button`,
  `ui/card` primitives.

## Risks
- **Tap vs drag on touch.** Embla fires pointer events with a movement
  threshold; a tap (negligible movement) must expand the card while a
  drag scrolls. If Embla's threshold misclassifies, taps could both
  expand and nudge the carousel. Mitigation: gate expand on pointer-up
  within a small movement delta; if Embla reports a drag occurred
  (`emblaApi.on('dragStart')`/pointer movement > threshold), suppress the
  expand. Verify on a real touch device.
- **Hover overlay clipping inside Embla viewport.** The scaled-up hover
  card + overlay may clip at the carousel's horizontal bounds (overflow
  hidden on the viewport). Mitigation: the overlay panel covers the card
  in place (does not expand beyond the card's box); only the scale
  transform grows it — keep scale modest (~1.05) and accept minor clip,
  or add horizontal padding to the viewport. Verify visually.
- **One-expanded-at-a-time bookkeeping.** Per-carousel single-expanded
  requires a small piece of state (which card index is expanded) lifted
  to the section. Cheap but easy to forget on unmount/navigation.
- **Header pending-during-load-more regression.** The cleanest guard is
  "don't flip `status` during load-more." If the existing `consumeStream`
  couples the pending flip to stream start regardless of caller intent,
  refactoring it to accept an `isLoadMore` flag (skip the `status` reset,
  still update stage/found/target) is the safest path. Risk: leaving the
  coupling and gating only the header can leak pending into other
  consumers (e.g. the centered composition reappearing mid-load-more).
- **Scroll-to-first-new timing.** Same Embla dynamic-append hazard as
  0009's slide-to-latest: must `reInit()` after React commits the new
  items before `scrollTo(previousTailIndex)`. Reuses the existing
  `setTimeout(…,50)` pattern; verify index lands correctly.
