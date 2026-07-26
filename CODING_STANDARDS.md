# Coding Standards

The rules agents and contributors must follow in `my-flix`. Enforced by Biome +
`tsc --noEmit` where possible; the rest is judgement in code review.

For the domain language, read [`CONTEXT.md`](./CONTEXT.md) first. For the stack
and setup, read [`README.md`](./README.md). This doc only covers *how* to write
code, not *what* the app does.

## Stack (don't change without an ADR)

TanStack Start + Router + Query · React 19 · Vite 7 · Nitro · Tailwind v4
(CSS-only theme) · shadcn `base-nova` · Drizzle + Postgres · Better-Auth ·
`motion` (Framer Motion v12, imported as `motion/react`) · zod.

## 1. Tooling

- **Package manager:** `npm`. No lockfiles from other managers.
- **Node:** 20+ (`.nvmrc`). `engines.node` enforces it.
- **Lint/format:** Biome. One config, formatter + linter. Do not add ESLint or
  Prettier.
- **Typecheck:** `npm run typecheck` (`tsc --noEmit`). Must pass.
- **Tests:** deferred. No runner yet. `/implement` skips `/tdd` until a
  page-level test infra decision is made (Vitest+RTL with SSR context vs
  Playwright E2E).

## 2. TypeScript

- `strict: true` plus `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`, `noFallthroughCasesInSwitch`.
- `include: ["src"]`. `exclude` build output + `src/routeTree.gen.ts` (generated).
- `lib: ["ES2022", "DOM", "DOM.Iterable"]`.
- **No `any`.** Use `unknown` + narrow, or a proper type.
- **`type` everywhere**, not `interface`. Exception: declaration merging (rare).
  Biome `no-interface` enforces.
- Path alias: `@/* → ./src/*`. No relative imports that cross `src/`.

## 3. File conventions

- **Kebab-case filenames** for everything we author: `movie-card.tsx`,
  `use-watchlist.ts`, `user-preferences.ts`.
- **Exception:** `src/components/canvasui/*` stays PascalCase
  (`Frost.tsx`, `Clouds.tsx`, `Glitch.tsx`, `ParticleScroll.tsx`) — these ship
  verbatim from the `@canvas-ui` registry; renaming breaks updates.
- **One component per file.** Co-locate small subcomponents only when not
  reused outside the file.
- **Named exports only:** `export function Navbar()`. No `export default`.
  Biome `no-default-export` for components. canvasui dual-export is grandfathered.
- **No `"use client"` directive.** TanStack Start doesn't honor it. The
  server/client boundary is enforced by `createServerFn` stripping + module
  isolation (server-only deps imported inside handlers; see `preferences-server.ts`).
- **Comments:** best-effort. When a file implements a spec or ADR, a header
  comment referencing it (`Spec 00XX`, `ADR 00XX`) is the existing habit —
  keep it, don't mandate it.

## 4. Components

- **`function` declarations**, not arrow-const components.
- **Props:** `type XProps = { ... }`. Destructure in the signature.
- **Combine classNames with `cn()`** (`src/lib/utils.ts`) whenever a class list
  mixes base + conditional + consumer-passed `className`. Template strings are
  fine *only* for fully-static lists with no conditionals and no forwarding.
  `tailwind-merge` must always be able to resolve consumer overrides.
- **Always forward `className` last:** `cn(base, conditional, className)`.
- **Cards have distinct responsibilities — pick the right one, don't merge:**
  - `components/card.tsx` — static poster + badge slot.
  - `components/movie-card.tsx` — Netflix hover-overlay + reactions.
  - `components/recommendation-card.tsx` — AI reasoning text + expandable state.
- **Shared class strings live in `lib/utils.ts`** next to `HIT_ZONE`:
  `PILL_BUTTON_CLASS`, etc. Don't re-declare them per file.
- **Scrim:** use the `.scrim-top` / `.scrim-bottom` / `.scrim-radial` utilities
  in `app.css`. Don't hand-roll `bg-gradient-to-b …` or arbitrary
  `bg-[radial-gradient(...)]` per component.

## 5. Styling & theme

- **Tokens only.** Use `bg-background`, `text-primary`, `text-destructive`,
  `border-border`, `text-muted-foreground`, etc. **No raw Tailwind palette
  colors** (`text-red-600`, `bg-yellow-400`, `hover:bg-gray-50`,
  `focus-visible:ring-blue-500`).
- **Reaction states map to `--destructive`.** One red system, not two.
- **Do not change the existing theme tokens** in `src/styles/app.css`
  (`:root`, glass tokens, easings, shadows). Add new *utility classes* if
  needed; do not redefine tokens. If a semantic color is missing, propose a
  new utility or token in an ADR — don't sprinkle raw palette.
- **Tailwind v4:** theme is CSS-only in `app.css`. No `tailwind.config.*`.
- **Fonts:** `font-display` (Outfit) for headings/brand; `font-sans` (Inter) body.
- **Responsive:** mobile-first `sm:`/`md:`/`lg:`/`xl:`/`2xl:`.
- **Motion:** use presets from `src/lib/motion.ts` (`ctaDramaSpring` for icon
  CTAs). `<MotionConfig reducedMotion="user">` is mounted in `__root.tsx`.
  Respect `prefers-reduced-motion` and `prefers-reduced-transparency`.

## 6. Routes

File routes in `src/routes/`. One route per file, flat-dot convention
(`movies.index.tsx`, `tvs.airing-today.tsx`, `api/recommendations/stream.ts`).
Splat catch-all via `$` (`api/auth/$.ts`).

Every data-driven page is a **four-part assembly**:

1. **Query layer** (`src/lib/queries/<domain>.ts`)
   - **Key factory** — colocated with the options. One factory per domain:
     ```ts
     export const moviesKeys = {
       all: ["movies"] as const,
       discover: (args: DiscoverFilters) =>
         [...moviesKeys.all, "discover", args] as const,
     };
     ```
   - **`queryOptions` factory** wrapping the key + server fn:
     ```ts
     export const discoverMoviesOptions = (args: DiscoverFilters) =>
       queryOptions<DiscoverResult>({
         queryKey: moviesKeys.discover(args),
         queryFn: () => fetchDiscoverMovies({ data: { ... } }),
       });
     ```

2. **Route definition** (`src/routes/<route>.tsx`) — `createFileRoute` carries:
   - `validateSearch: z.object({ ... })` — every search param, with
     `z.coerce.number()` for numerics. The source of truth for URL shape.
   - `loaderDeps: ({ search }) => ({ ... })` — pick only the search fields the
     query depends on. Reduces invalidations.
   - `loader: async ({ context, deps }) => await context.queryClient
     .ensureQueryData(<options factory>(deps))` — prefetches so SSR hydrates
     the cache and the client does not refetch on mount.
   - `component` — reads the same deps + same options via `useSuspenseQuery`.
   - `pendingComponent: () => <XSkeleton />` — **always a skeleton**, never a
     bare spinner, never `null`. One skeleton per route in
     `src/components/skeletons/<route>-skeleton.tsx`.

3. **Component** — `useSuspenseQuery(<same options factory>)`, then wrap the
   rendered output in `<Suspense fallback={<XSkeleton />}>`. The `<Suspense>`
   fallback matches the `pendingComponent` so loading transitions don't flicker
   to a different shape.

4. **Skeleton** (`src/components/skeletons/<route>-skeleton.tsx`) — kebab-case,
   default export, mirrors the page's layout shells (no real data).

Rules:

- **Same options object in loader and component.** No second source of truth
  for the query key — if the key changes, it changes in the `queryOptions`
  factory only.
- **`pendingComponent` is always a skeleton.** A route without a skeleton is a
  standards violation, not a stylistic choice.
- **Search params go through `validateSearch` + zod**, not `useSearch` raw.
- **Mutations** (writes) live in hooks (`src/hooks/use-*.ts`), not in route
  files.

## 7. Data fetching

- **Three layers, one options object:**
  1. Server fn in `src/lib/data/*.ts` (`createServerFn`).
  2. `queryOptions` factory in `src/lib/queries/*.ts` (owns the query key).
  3. Route `loader` calls `context.queryClient.ensureQueryData(sameOptions)`;
     component reads via `useSuspenseQuery(sameOptions)`.
  - The same options object is shared between loader and component — **no
    second source of truth for the key.**
- **Server fns throw on failure.** Never return `{ success: false, error }`.
  TanStack Router's `errorComponent` renders thrown errors. Callers `try/catch`
  around mutations only when they recover locally.
- **`fetchFromTMDB` checks `res.ok` and throws** on non-2xx. No silent error
  bodies returned to callers.
- **`inputValidator`: zod or remove.** If a server fn takes input, validate
  with a real zod schema. No identity-arrow `inputValidator` that only carries
  a TS annotation — those validate nothing at runtime.
- **Server-only deps stay server-only:** heavy imports (`postgres`, `Buffer`,
  AI SDKs) live inside the handler or a `*-server.ts` module. Dynamic
  `await import(...)` inside handlers when needed.
- **`getDb()` and `auth` are request-scoped** (fresh per call/access).

## 8. State

- **TanStack Query is the global store.** No Zustand/Redux/Context for server
  state. Local `useState` for ephemeral UI only.
- **Optimistic-toggle hooks** (`src/hooks/use-{watchlist,liked-items,disliked-items}.ts`)
  follow the `onMutate`/`onError`/`onSettled` recipe: `cancelQueries` →
  `setQueryData` optimistic → rollback on error.
- **Toast on rollback:** every hook's `onError` calls `toast.error(...)` after
  rolling back, so a failed like/dislike/watchlist is never silent. Format:
  `"Couldn't save your like. Reverted."`.
- **Custom hooks live in `src/hooks/`** (`use-*.ts`). One concern per hook.
  Hooks that read server state wrap TanStack Query, not parallel `useState`.
- **URL state via TanStack Router `validateSearch`** + zod coercion for
  `page`/`genres`/`rating`/`year`/`query`.
- **No duplicate stores for the same domain.** A domain flows through Query as
  a single source; UI reads from the cache, not a parallel local copy.

## 9. Accessibility

- **Icon-only interactive elements need an accessible name:** `aria-label` or
  `<span className="sr-only">`. `<Tooltip>` is supplementary, not the source
  of the name.
- **Decorative imagery:** `alt=""`. Content imagery: `alt={title}`.
- **Respect reduced-motion / reduced-transparency** (handled globally; don't
  re-implement per component).

## 10. Environment

- **Canonical env var names** (code is the source of truth, not the README):
  `DATABASE_URL`, `TMDB_TOKEN` (not `TMDB_API_KEY`), `INCLUDE_ADULT` (not
  `INCLUDE_ADULT_CONTENT`), `GOOGLE_GENERATIVE_AI_API_KEY`, `MISTRAL_API_KEY`,
  `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`.
- **`.env.example`** is the manifest of required vars. Keep it in sync.
- Access via `process.env.X` server-side only. Never leak secrets to client fns.

## 11. Commits

- **Conventional Commits:** `type(scope): subject`.
  Types: `feat`, `fix`, `refactor`, `docs`, `chore`, `style`, `perf`, `test`.
  Scope optional but encouraged (`feat(navbar):`, `fix(recommendations):`).

## 12. Skills & specs

- Before substantial edits, run `npx @tanstack/intent@latest list` and load a
  matching skill (see `AGENTS.md`).
- When a change implements a numbered spec or ADR, reference it in the PR/commit.
- A loaded skill's declared deliverable wins over the default plan-mode flow.
