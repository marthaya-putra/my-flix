# 001 — Add hover scale flair to card CTA buttons

- **Status**: TODO
- **Commit**: 09dd2e7
- **Severity**: HIGH
- **Category**: Missed opportunities / Physicality
- **Estimated scope**: 2 files (~10 small edits)

## Problem

Card CTA buttons (Play, Like, Dislike) on `movie-card.tsx` and `recommendation-card.tsx` have **press feedback only** (`whileTap={{ scale: 0.7 }}`) and **no hover motion**. Hover state is a CSS-only background tint — no scale, no lift, no spring. The result reads as flat: the buttons don't feel interactive until pressed.

Evidence — every CTA is wrapped in a `motion.div` with `whileTap` but **no `whileHover`**:

```tsx
// src/components/movie-card.tsx:141 (Play button has no motion wrapper at all)
<PlayLink title={title} category={category}>
  <Button size="icon" className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10">
    <Play className="w-4 h-4 fill-current ml-0.5" />
  </Button>
</PlayLink>

// src/components/movie-card.tsx:141 (Like — press only, no hover)
<motion.div whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
  <Button ...> <ThumbsUp .../> </Button>
</motion.div>

// src/components/recommendation-card.tsx:133, 152, 234, 253 (4 CTAs — press only, no hover)
<motion.div whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
  <Button ...> <ThumbsDown .../> </Button>
</motion.div>
```

## Target

Add a subtle **lift on hover** (`scale: 1.1`) to every card CTA, paired with the existing press (`scale: 0.7`). Hover and press share the same spring so the gesture feels like one continuous physical action. Use the repo's existing `ctaDramaSpring` — no new presets.

```tsx
// target — every CTA motion wrapper
<motion.div
  whileHover={{ scale: 1.1 }}
  whileTap={{ scale: 0.7 }}
  transition={ctaDramaSpring}
>
```

The MovieCard **Play** button currently has no motion wrapper at all — wrap it in the same `motion.div` so Play gets hover + press parity with the thumb buttons.

## Repo conventions to follow

- Motion presets live in `src/lib/motion.ts`. `ctaDramaSpring` (`{ type: "spring", stiffness: 400, damping: 12 }`) is the documented preset for "icon CTAs" and is already imported in both files.
- `whileTap={{ scale: 0.7 }}` + `ctaDramaSpring` is the existing CTA gesture pattern — extend it with `whileHover`, do not replace it.
- Exemplar: `src/components/recommendation-card.tsx:133` (the existing `whileTap` block to mirror).

## Steps

### 1. `src/components/movie-card.tsx` — Play button gets hover + press

The Play button (currently around line 124–130) is inside `<PlayLink>` and has **no motion wrapper**. Wrap the `<Button>` in a `motion.div` with hover + press.

Find:
```tsx
<PlayLink title={title} category={category}>
  <Button
    size="icon"
    className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10"
  >
    <Play className="w-4 h-4 fill-current ml-0.5" />
  </Button>
</PlayLink>
```

Replace with:
```tsx
<PlayLink title={title} category={category}>
  <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
    <Button
      size="icon"
      className="w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10"
    >
      <Play className="w-4 h-4 fill-current ml-0.5" />
    </Button>
  </motion.div>
</PlayLink>
```

### 2. `src/components/movie-card.tsx` — Like button gets hover

Around line 141, the Like button's `motion.div` has `whileTap` only. Add `whileHover`.

Find:
```tsx
<motion.div whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
```

Replace with:
```tsx
<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
```

### 3. `src/components/recommendation-card.tsx` — all 4 CTAs get hover

There are **four** identical `motion.div` wrappers in this file (dislike + like in the hover overlay around lines 133 & 152; dislike + like in the expanded overlay around lines 234 & 253). All four currently read:

```tsx
<motion.div whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
```

Replace **all four occurrences** with:

```tsx
<motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
```

### 4. `src/components/recommendation-card.tsx` — Play buttons (×2) get hover + press

The two Play buttons (hover overlay ~line 126, expanded overlay ~line 227) currently have no motion wrapper:

```tsx
<PlayLink title={recommendation.title} category={recommendation.category}>
  <Button variant="default" size="sm" className="gap-1.5 text-xs h-8 rounded-full px-4 bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10">
    <Play className="h-3.5 w-3.5 fill-current" />
    Watch
  </Button>
</PlayLink>
```

Wrap each `<Button>` in a `motion.div` with hover + press:

```tsx
<PlayLink title={recommendation.title} category={recommendation.category}>
  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }} transition={ctaDramaSpring}>
    <Button variant="default" size="sm" className="gap-1.5 text-xs h-8 rounded-full px-4 bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10">
      <Play className="h-3.5 w-3.5 fill-current" />
      Watch
    </Button>
  </motion.div>
</PlayLink>
```

(Play is a wider pill than the icon buttons, so use a slightly smaller scale — `1.05` hover / `0.92` press — so it doesn't overshoot visually.)

## Boundaries

- Do NOT touch static styling (colors, borders, shadows, `rounded-full`, `shadow-lg`).
- Do NOT change `ctaDramaSpring` or add new presets to `src/lib/motion.ts`.
- Do NOT change the press scale `0.7` on thumb buttons — only **add** `whileHover`.
- Do NOT touch `card.tsx` (no CTAs).
- If line numbers drift from the commit stamp, locate blocks by the exact code excerpts above, not by line number.

## Verification

- **Mechanical**: `npx tsc --noEmit` exits clean. `npm run lint` (or project equivalent) exits clean.
- **Feel check**: run the dev server, hover over each CTA on a movie card and a recommendation card:
  - On hover, the button visibly grows (~10%) and settles with a soft bounce.
  - On press, it shrinks to 0.7 and bounces back — existing behavior, unchanged.
  - Hovering on / off quickly never snaps — the spring catches it mid-motion (interruptible).
  - The Play pill (wider) grows less than the round thumb buttons — both feel proportionate.
  - In DevTools Animations panel, set playback to 10% and hover a thumb button: confirm the scale-up eases out with a tiny overshoot, no linear feel.
  - Toggle `prefers-reduced-motion` (Rendering panel) — Motion drops transform automatically; the CSS bg tint still gives hover feedback.
- **Done when**: all 6 CTA motion wrappers (1 MovieCard Like + 1 MovieCard Play + 2 RecCard thumb pairs + 2 RecCard Play) have `whileHover` and the build passes.
