# Spec 0009: Recommendations UI redesign — sectioned carousels with live progress

## Prerequisite
Spec 0007 (progress events + `groupStart.target`) AND spec 0008
(category-scoped stream requests) deployed. This spec is blocked without
both — it consumes their wire additions.

## Problem
The current recommendations render
(`src/components/recommendations.tsx:412-479`) has three compounding UX
defects:

1. **No structure.** Movie and TV cards are dumped into ONE undifferentiated
   `flex flex-wrap` row (`:420`), with per-category skeletons (`:440-447`)
   and error cards (`:450-463`) mixed in. There are no "Movies" / "TV"
   section headers. The eye has nothing to anchor on while cards pop in.
2. **Static loading.** While a category streams, the only feedback is N bare
   skeleton card placeholders (`:440-447`, 3 per side). No status text, no
   stage label, no count, no "2 of 3". On a slow round or slow TMDB
   enrichment the user stares at shimmer blocks with zero signal that
   anything is progressing. (The rich progress data exists post-0007 but is
   not yet rendered.)
3. **Coarse Load More.** `handleLoadMore` (`:224-234`) re-runs BOTH
   pipelines in one stream call. The user cannot refresh just movies. The
   button label flips to "Loading more..." (`:473-475`) — that is the only
   load-state affordance.

Net effect: the page feels static and gives no feedback during the slowest,
most uncertain phase (generation). Users get bored and perceive hangs.

## Goal
Redesign the recommendations surface into sectioned per-category carousels
with live progress headers that surface pipeline stage + survivor count
during streaming, replace the bare skeletons with meaningful progress,
hide count imbalance between categories via fixed-height carousels, and
support per-category Load More that slides to the latest items.

## Decisions
- **Layout: two stacked full-width sections.** Each category (Movies, TV)
  renders as its own vertical block: a section header, a horizontal
  carousel of recommendation cards, and a per-category Load More control.
  Remove the single mixed `flex flex-wrap` row (`:420`). Sections stack
  vertically (Movies above TV) and are full-width — NOT side-by-side
  columns, so the existing wide card design (poster + details side-by-side)
  is preserved without fighting for horizontal space.
- **Carousel: reuse the existing Embla primitive.** `embla-carousel-react`
  is already a dependency (`package.json`), and a full carousel primitive
  exists at `src/components/ui/carousel.tsx` (exports `Carousel`,
  `CarouselContent`, `CarouselItem`, `CarouselPrevious`, `CarouselNext`,
  `CarouselApi`). Compose these directly — do NOT reuse `src/components/content-row.tsx`,
  because `ContentRow` renders compact `MovieCard`s (poster-only, `xl:basis-1/6`);
  we need the wide `RecommendationCard`. Pattern reference for Embla
  composition + responsive basis + hover-reveal nav buttons:
  `content-row.tsx:59-94`.
- **Card: keep the existing wide `RecommendationCard`.** Poster + details +
  inline AI reason text (the core AI value prop — why a title is
  recommended — must be visible at a glance, not hidden behind a hover).
  Carousel item basis: `basis-full sm:basis-1/2 lg:basis-1/3` (1-up on
  mobile, 2-up small, 3-up large). Embla `dragFree: true` (matches
  `ContentRow`) so cards scroll freely rather than paging one-at-a-time.
- **Live progress header (while `categoryStatus === "pending"`):** the
  section header itself becomes the progress indicator. It shows:
  - The human-readable stage label, mapped from `StreamStage`:
    `finding_titles` → "Finding titles", `looking_up_posters` → "Looking up
    posters & details", `finalizing` → "Finalizing".
  - The survivor count: `found of target`, sourced from the `progress`
    event's `found` (server-authoritative, spec 0007) and `groupStart.target`.
  - An animated fill bar: `width: (found / target) * 100%`.
  Source of truth is the server `progress.found` value; the client must NOT
  independently count `item` events and second-guess it (the server emits
  `progress.found` immediately after each item yield, in order — they agree
  by construction; spec 0007 documents this invariant).
- **Header collapse on completion.** On `groupEnd{ok}`, the header
  collapses to a simple settled label: "Movies · N picks" (no bar, no
  stage). This collapse is the satisfying "settling" beat that is absent
  today — it signals a section is done.
- **Skeletons are removed.** Delete the per-category skeleton blocks
  (`:440-447`) and the session-pending skeleton block (`:209-220`). The
  live progress header replaces them as the loading affordance. The route
  `pendingComponent` (`src/routes/recommendations.tsx:19-37`) is simplified
  to a lightweight generic loader (e.g. a centered spinner + "Loading
  recommendations") rather than a 6-skeleton grid — the skeletons no longer
  have a post-load role.
- **Per-category Load More.** Each section has its own "Load more [movies|TV]"
  button. Clicking calls `consumeStream` with `categories:[thatCategory]`
  (spec 0008) and that category's currently-shown items as
  `previousRecommendations` (so the server excludes them). The OTHER
  category is untouched — its state, carousel position, and cards stay.
  This requires `consumeStream` to accept a `categories` parameter and
  thread it into the request body (`src/components/recommendations.tsx:136-138`).
- **Slide-to-latest on new items.** When new items arrive from a Load More,
  call the Embla API to scroll to the latest slide so the newest
  recommendations are visible. Use `CarouselApi` (returned by Embla's
  `setApi`/`onInit`) — after React commits the new `CarouselItem`s, call
  `api.reInit()` (Embla recomputes slides on content change) then
  `api.scrollNext()` in a loop / `api.scrollTo(lastIndex)` to land on the
  newest. The prev/next arrow buttons let the user navigate back to
  earlier recommendations.
- **Found reconciliation / smoothing.** The live display reads
  `progress.found` directly. As `item` events also arrive, the client may
  render cards optimistically (they're already in the recommendation list
  via the existing `item` dispatch at `:108-109`). The header count and the
  rendered card count should agree; clamp the displayed count to `target`
  to avoid ever showing "4 of 3" if a stray event arrives.
- **Errors scoped per section.** The per-category inline error card
  (`:450-463`) is preserved but rendered within its category's section, not
  in the shared row. The fatal-error block (`:393-399`) and empty-state
  (`:401-409`) are preserved at the top level.

## Non-goals
- No backend changes (specs 0007 + 0008 own the protocol and pipeline).
- No `RecommendationCard` content redesign (keep the wide card layout).
- No mobile-specific reason drawer / expand-to-read (reason stays inline).
- No infinite scroll (explicit per-category Load More button stays).
- No change to optimistic like/dislike handlers or image-error handling.
- No persistence of carousel scroll position across page navigations.

## Acceptance criteria
1. Movies and TV render as two separate stacked full-width sections, each
   with its own header + carousel + Load More control. The single mixed
   `flex flex-wrap` row is gone.
2. While a category streams (`categoryStatus === "pending"`), its header
   shows the current stage label (human-readable), the `found of target`
   count, and an animated fill bar — all driven by the `progress` event
   and `groupStart.target`.
3. No skeleton cards are rendered during streaming (the live header is the
   loading affordance). The `RecommendationCardSkeleton` per-category and
   session-pending blocks are removed.
4. On `groupEnd{ok}`, the header collapses to "Movies · N picks" (or
   "TV · N picks") with no bar and no stage label.
5. Recommendation items render in a horizontal Embla carousel, one
   `CarouselItem` per `RecommendationCard`. The wide card (poster +
   details + inline reason) is preserved.
6. Each section has a "Load more [movies|TV]" button that triggers a
   category-scoped stream (`categories:[thatCategory]`). The other section
   is not touched — its carousel, position, and state are unchanged.
7. When new items arrive from a per-category Load More, the carousel
   scrolls to show the latest items. The prev/next arrows navigate back to
   earlier recommendations.
8. A per-category error (`groupEnd` with non-ok status, zero survivors)
   renders an inline error card within that category's section only.
9. The route `pendingComponent` still shows a non-blank state during
   navigation (lightweight loader, not a blank screen).
10. The count imbalance between categories (e.g. Movies has 6 after two
    loads, TV has 3) does not break layout — both carousels are
    fixed-height rows regardless of item count (imbalance is hidden by the
    carousel's horizontal scroll).
11. The existing `AbortController` unmount/Load-More cancellation
    (`:99-100`, `:190`) still works — navigating away or starting a new
    load aborts the in-flight stream.
12. The `inFlight` StrictMode dedupe (`:65`, `:88-89`) still prevents
    double-firing the initial stream on mount.

## Files
- `src/components/recommendations.tsx` (MODIFIED, major) — sectioned
  render (replace `:412-479`); `dispatch` handles the new `progress` event
  (store per-category stage + found in state); read `target` from
  `groupStart`; `consumeStream` accepts a `categories` param and threads it
  into the request body; remove skeleton logic (`:209-220`, `:440-447`);
  split per-category Load More handlers. Owns: state machine + data flow.
- `src/components/recommendations/category-section.tsx` (NEW) — renders one
  category: the live/collapsed header + carousel + per-category Load More
  button + inline error. Owns: section-level layout + Load More trigger.
- `src/components/recommendations/live-progress-header.tsx` (NEW) — renders
  the stage label + `found/target` count + animated fill bar while pending,
  collapsing to "· N picks" on completion. Owns: the progress visualization.
- `src/components/recommendations/recommendation-carousel.tsx` (NEW) — Embla
  `Carousel` wrapper around wide `RecommendationCard`s; exposes slide-to-
  latest (via `CarouselApi`) for the Load More flow; wires prev/next arrows.
  Owns: carousel mechanics + slide-to-latest hook.
- `src/routes/recommendations.tsx` (MODIFIED) — simplify `pendingComponent`
  (`:19-37`) to a lightweight generic loader.
- `src/components/recommendation-card-skeleton.tsx` (DELETE if no longer
  imported after the `pendingComponent` change; otherwise keep for any
  remaining external consumer — verify with grep before deleting).
- `specs/0009-recommendations-ui-redesign.md` (NEW) — this spec.

## Independence check
- Consumes spec 0007's `progress` event + `groupStart.target` and spec
  0008's `categories` request field. Blocked without both.
- Owns ALL client files — no backend overlap with 0007 or 0008.
- Reuses the existing Embla primitive (`src/components/ui/carousel.tsx`)
  and `RecommendationCard` — no new dependencies, no new card component.
- Does NOT touch the AI/prompt layer, the data layer, or the stream route.
- Sequenced LAST: 0007 and 0008 can each ship independently (and the app
  keeps working); 0009 is the consumer that makes the user-visible change.

## Risks
- **Embla slide-to-latest on dynamic item append.** Embla computes slide
  count on init; appending `CarouselItem`s after mount requires
  `api.reInit()` before `scrollTo`/`scrollNext`, and the call must fire
  after React commits the new children (use a `useEffect`/`useLayoutEffect`
  keyed on item count, or Embla's `on:settle`/slides-changed event). Verify
  the API hook timing — calling `scrollTo` before `reInit` lands on the
  wrong index. Worst case: the carousel doesn't auto-scroll and the user
  manually arrows forward (degraded but not broken).
- **Wide cards at `basis-1/3` + `dragFree`.** Embla handles arbitrary item
  widths, but confirm 1-up on mobile (`basis-full`) isn't too sparse and
  that the wide card (poster + details side-by-side, `min-h-[248px]`)
  renders cleanly inside a `CarouselItem` at full width. If the wide card
  is too tall/sparse at 1-up on narrow viewports, consider a vertical card
  variant for mobile only — but that is out of scope unless it blocks.
- **Progress header re-renders per item.** Each `progress` event (one per
  survivor) updates header state, re-rendering the section. With ≤6 items
  per load this is negligible; if MAX_ROUNDS or TARGET grows, memoize the
  header or throttle. Not a concern at current constants.
- **`consumeStream` signature change.** Adding a `categories` param touches
  the function called from `useEffect` (`:201-207`, the initial both-
  categories load) and from the new per-category Load More handlers. Ensure
  the initial mount call still requests both (omit `categories` or pass
  both explicitly) so first load is unchanged.
