# Rating semantic token (not raw Tailwind yellow)

Star ratings used raw `text-yellow-400` / `bg-yellow-600/90` / `border-yellow-400/20`
directly in `recommendation-card.tsx`, `hero.tsx`, and the `content-cards` rating
row. `CODING_STANDARDS.md` §5 forbids raw Tailwind palette colors and requires a
semantic token or utility whenever a color is missing from the theme — "don't
sprinkle raw palette."

We added a single `--rating` token (`48 96% 53%`, an exact match for the
`yellow-400` it replaces) wired through `@theme inline` as `--color-rating`, so
the standard `text-rating` / `bg-rating` / `fill-rating` / `border-rating`
utilities generate automatically — no hand-rolled `.text-rating` class.

## Why a new token instead of reusing an existing one

No existing token fits "rating." The brand accent (`--primary`) is red and is
already the watchlist active color; the chart tokens carry their own meaning. A
rating is a distinct semantic concept (third-party score, IMDb-style star), so it
gets its own token rather than overloading `--chart-3` (the nearest amber) and
confusing two unrelated roles. (That anti-overload reasoning is scoped to the
**rating** specifically — see "Chart-token reuse for categories" below for where
reuse *is* appropriate.)

## Consequences

- **One source of truth** for the rating color; changing it later is a single
  HSL edit in `:root`.
- **No existing token changed** — the constraint in §5 ("do not change the
  existing theme tokens") holds; `--rating` is purely additive.
- **Rating-pill text is now `text-black`.** The old `bg-yellow-600/90
  text-white` had poor contrast on a mid-yellow; the lighter `--rating` is a
  near-white yellow, so black foreground is correct and accessible.
- **Dark theme only today.** `--rating` is defined once in `:root`. If a light
  variant is added later, re-declare `--rating` (and the rest of the palette) in
  the `.dark` override; the utilities pick it up automatically.

## Related decisions bundled into this sweep (issue #83)

The raw-palette sweep touched more than ratings. The non-obvious mappings:

- **Reaction reds → `--destructive`.** `dislike-button` used raw `red-500`; now
  `--destructive`, honoring §5's "one red system, not two."
- **Watchlist → `--primary`, not a new violet token.** `watchlist-button` used
  raw `violet-500`. The brand accent (`--primary`, `350 76% 56%`) is the
  designated "I want this" color in this app (it's also the primary CTA and the
  like-button active color), so watchlist reuses it rather than minting a
  one-off violet token. It is visibly distinct from `--destructive` (pink vs.
  red), so the "one red system" is preserved.
- **Chart-token reuse for categories.** `--chart-1..5` are reused as the
  *categorical* color system for non-chart UI: movie/TV/person type badges
  (`search-modal`, `person-content`), the rating-quality tier scale
  (`movie-card.getRatingColor`), and the success check (`wizard-complete`). This
  is legitimate reuse, not overloading — a chart-series token and a
  category/type-encoding badge fill the same role (visually distinguish N peer
  categories), so one palette covers both. A future app-wide categorical palette
  would absorb both; until then `chart-*` is that palette.
