# Test strategy: Vitest + RTL as the primary layer, Playwright E2E as a thin smoke layer

Issue #77 asked us to pick the page-level test infrastructure. The decision
that unlocks `/implement`'s `/tdd` step (per `CODING_STANDARDS.md` §1) is:
**Vitest + React Testing Library as the primary test runner, with Playwright
reserved for a small set of full-stack smoke tests.**

## Context

Every data-driven route is the same four-part assembly (see
`CODING_STANDARDS.md` §6): query layer → route definition (loader +
`validateSearch`) → component (`useSuspenseQuery`) → skeleton. The seams
that need test coverage were named in the issue:

1. **Pure logic** — zod `validateSearch` schemas, the `stream-events`
   classifier (`computeProgress`, `stageMessagesFor`), zod inputs on
   server fns. No React, no SSR.
2. **Optimistic-toggle hooks** — `use-watchlist`, `use-liked-items`,
   `use-disliked-items`. Pure client-side `QueryClient` manipulation; the
   `onMutate` / `onError` / `onSettled` recipe is the part that breaks
   silently.
3. **Repositories** — the `src/lib/repositories/*` data layer. Functions
   with a small surface that throw-on-failure per §7.
4. **Route loader behavior** — the loader → `useSuspenseQuery` → skeleton
   flow that is the heart of every page. This is the only seam that
   really exercises the SSR boundary.

Seams 1–3 are unit/integration tests. Only seam 4 is end-to-end.

## Decision

- **Vitest (jsdom) + React Testing Library** is the primary runner.
  Configured via `vitest.config.ts` with the existing `@vitejs/plugin-react`
  and `vite-tsconfig-paths`, mirroring the app's Vite pipeline. Tests live
  next to source (or in `src/**/__tests__/`) and run in-band.
- **Playwright** is added as a **complementary smoke layer** for the
  loader → SSR → hydrate flow on a small number of representative routes.
  It spins up the real dev server via `webServer` in `playwright.config.ts`
  and asserts the things that are awkward to assert with mocked router
  context: SSR HTML reaches the browser, the query cache hydrates, and the
  `<Suspense>` fallback is replaced by real content without a refetch
  flicker.

### Why not Playwright-only

4 of the 5 seams are pure logic with no React or no SSR. Driving a real
browser to test `computeProgress` or a zod schema is slow, brittle, and
loses the failure localization that a unit runner gives. Hooks can be
tested with RTL + a real `QueryClient` in jsdom — no dev server, no DB,
no TMDB.

### Why not Vitest-only

The loader → `ensureQueryData` → SSR dehydrate/hydrate wiring in
`src/router.tsx` is exactly the kind of integration that breaks in ways
unit tests can't catch (a missing `pendingComponent`, a key mismatch
between loader and component, a hydration desync). A handful of Playwright
smoke tests on routes that don't need credentials (e.g. `/login`) guard
that boundary without becoming a full E2E suite.

### Mocking strategy for Vitest

- **Pure logic** (schemas, classifier): no mocks. Import and assert.
- **Hooks**: wrap in a `QueryClientProvider` with a real `QueryClient`
  (no `mockProvider` — exercise the real cache). Mock only the server-fn
  boundary (`vi.mock("@/lib/data/preferences")`) so no network/DB runs.
- **Components**: mock the server fn; render with a real `QueryClient`
  provider so `useSuspenseQuery` reads a prefilled cache, mirroring how
  loaders hydrate state.
- **Route loaders**: not unit-tested in isolation. Covered by Playwright.

## Test runner & version pins

| Concern      | Runner                                  | Config                   |
| ------------ | --------------------------------------- | ------------------------ |
| Unit/integ   | Vitest + @testing-library/react (jsdom) | `vitest.config.ts`       |
| E2E smoke    | Playwright                              | `playwright.config.ts`   |

Both runners are invoked from `package.json` scripts (`test`, `test:e2e`).
CI is expected to run `test` on every change and `test:e2e` as a separate
job; the dev loop is `npm test -- --watch`.

## Required seams (where tests must exist before code is "done")

- `src/lib/data/stream-events.ts` → `computeProgress`, `stageMessagesFor`
- `src/hooks/use-{watchlist,liked-items,disliked-items}.ts` → optimistic
  toggle + rollback + toast on error
- zod `validateSearch` schemas on every data-driven route
- zod `inputValidator` schemas on every server fn that takes input
- `src/lib/repositories/*` → throw-on-failure behavior
- (Playwright) `/login` renders without a server error — the canary for
  the SSR + router-context wiring

## Consequences

- `CODING_STANDARDS.md` §1 "deferred" note is removed; `/implement` is
  expected to use `/tdd` at the seams above.
- Two test configs to maintain. Accepted: the boundaries they cover are
  disjoint, and dropping either reopens the gap that motivated #77.
- Playwright pulls a one-time browser binary download (~`npm run
  e2e:install`). Dev-only; not required for the unit suite.
