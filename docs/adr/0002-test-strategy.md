# Test strategy: Vitest integration tests at the API level + Playwright E2E smoke

Issue #77 asked us to pick the page-level test infrastructure. The decision
that unlocks `/implement`'s `/tdd` step (per `CODING_STANDARDS.md` §1) is:
**Vitest + React Testing Library for integration tests at the API level,
with Playwright reserved for a small set of full-stack smoke tests.**

## Core philosophy: integration, not isolation

**We do not write isolated unit tests on a single function.** Calling a
function in isolation and asserting on its return value is the shape we
explicitly reject: it locks tests to internal signatures, duplicates logic
the type checker already proves, and breaks the moment a refactor moves
behaviour without changing outcomes.

Instead, every Vitest test is an **integration test at the API level**:

- It drives the unit under test through its **public boundary** — the hook's
  returned object, the component's rendered output, the route's loader
  return — never by calling an internal function directly.
- It wires up the **real collaborators** (a real `QueryClient`, real
  providers, real zod schemas) and mocks only the **external edge** that
  can't run in jsdom: server fns (`createServerFn` handlers), `fetch`, the
  DB. No `mockImplementation` on modules we own.
- It asserts on **observable behaviour** through that boundary — what the
  hook returns, what the DOM shows, what cache keys get invalidated — not on
  intermediate call counts or internal state.

### The "complex logic" gate

Integration tests are not free, so they are written **only where the API
hides non-trivial logic**. A hook that reads a query and returns it verbatim
does not earn a test. A hook/route earns a test when its body contains:

- an optimistic-update + rollback + invalidation recipe (`onMutate` /
  `onError` / `onSettled`),
- branching that maps inputs to qualitatively different outputs (e.g. the
  streaming-progress classifier that decides label vs. label · found of
  target vs. null),
- error-to-UI mapping that the type checker cannot catch (toast-on-rollback,
  thrown-server-fn → `errorComponent`).

If a function is a thin pass-through, **do not test it.** The type checker
and the consumer's integration test cover it.

## Context

Every data-driven route is the same four-part assembly (see
`CODING_STANDARDS.md` §6): query layer → route definition (loader +
`validateSearch`) → component (`useSuspenseQuery`) → skeleton. The seams
worth integration-testing, and the **API level** each is driven through:

| Seam                                   | API level driven in the test                           | Why it earns a test                                                 |
| -------------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------- |
| Optimistic-toggle hooks                | the hook's returned `{ isX, toggleX, isToggling }`    | rollback + invalidation recipe; silently wrong if broken            |
| Route `loader` + `validateSearch`      | the loader's return / rendered route output            | key-mismatch between loader and `useSuspenseQuery` is the silent bug |
| Streaming-progress rendering           | the rendered DOM of the component that consumes it    | classifier + copy + skeleton transitions interlock                  |
| Repositories (throw-on-failure)        | the server fn's observable result, not the repo direct | failure must throw, not return `{ success: false }`                |

Pure logic (zod schemas, the progress classifier in isolation) is **not**
given its own test file. It is covered by the integration test that
consumes it — a schema by the loader/route that validates search with it,
the classifier by the component whose DOM reflects its output. This keeps
the test count proportional to behaviour, not to source-file count.

## Decision

- **Vitest (jsdom) + React Testing Library** is the primary runner.
  Configured via `vitest.config.ts` with the existing `@vitejs/plugin-react`
  and `vite-tsconfig-paths`, mirroring the app's Vite pipeline. Tests live
  next to source (`src/**/*.{test,spec}.{ts,tsx}`) and run in-band.
- **Playwright** is a **complementary smoke layer** for the loader → SSR →
  hydrate flow on a small number of representative routes. It spins up the
  real dev server via `webServer` in `playwright.config.ts` and asserts the
  things that are awkward to assert with a mocked router context: SSR HTML
  reaches the browser, the query cache hydrates, the `<Suspense>` fallback
  is replaced by real content without a refetch flicker.

### Why not Playwright-only

The hooks and the loader wiring break in ways a browser test catches late
and localizes badly. Driving a real browser to check an optimistic-toggle's
rollback is slow, flaky on CI, and hides which line of `onMutate` was
wrong. A Vitest integration test against the hook's API runs in tens of
milliseconds and fails at the exact recipe.

### Why not Vitest-only

The loader → `ensureQueryData` → SSR dehydrate/hydrate wiring in
`src/router.tsx` is exactly the kind of integration that breaks in ways
jsdom can't catch (a missing `pendingComponent`, a hydration desync). A
handful of Playwright smoke tests on routes that don't need credentials
(e.g. `/login`) guard that boundary without becoming a full E2E suite.

### Mocking strategy for Vitest

The rule is one sentence: **mock the external edge, wire everything inside
it for real.**

- **Server fns** (`@/lib/data/*`) — `vi.mock` the module. The server fn is
  the boundary between client cache and the network/DB; everything behind
  it (postgres, Better-Auth, TMDB, AI SDKs) is implied by mocking the fn.
- **`QueryClient`** — real instance in a `QueryClientProvider`, never
  `queries: { retry: false }` shortcuts that hide retry bugs unless the
  test is specifically about retry.
- **Pure helpers / schemas / classifiers** — never mocked. They run for
  real inside the integration test that consumes them.
- **Internal functions are never called directly from a test.** If a test
  reaches into `computeProgress` or a repo function by name, it is the wrong
  shape — rewrite it to drive the consuming hook/component/route instead.

## Test runner & version pins

| Concern      | Runner                                  | Config                 |
| ------------ | --------------------------------------- | ---------------------- |
| Integration  | Vitest + @testing-library/react (jsdom) | `vitest.config.ts`     |
| E2E smoke    | Playwright                              | `playwright.config.ts` |

Both runners are invoked from `package.json` scripts (`test`, `test:e2e`).
CI is expected to run `test` on every change and `test:e2e` as a separate
job; the dev loop is `npm test -- --watch`.

## Required seams (where an integration test must exist before code is "done")

Apply the **complex-logic gate** to each before writing anything:

- `src/hooks/use-{watchlist,liked-items,disliked-items}.ts` — **yes.** Drive
  via the hook API: optimistic toggle appears in the returned `isX` before
  the server resolves; rollback restores prior state on rejection; the
  cache keys the hook owns are invalidated on settle.
- Streaming-progress components that consume `stream-events` — **yes**, but
  through the rendered DOM. The classifier is tested by what the component
  shows for a given progress event, not by calling `computeProgress`.
- Route `loader` + `validateSearch` — **yes** when the search schema has
  coercion/defaults that affect the query key. Drive via the loader return
  or a rendered route; assert the prefilled cache, not the schema direct.
- Repositories — **only** the throw-on-failure contract, and only through
  the server fn that calls them, not the repo direct.
- zod `inputValidator` on server fns — covered by the server fn's
  integration test (rejected input throws); no standalone schema test.

If a seam fails the gate (thin wrapper, no branching, no error mapping), it
gets **no test**. That is the correct outcome, not a gap.

## First example

`src/hooks/use-watchlist.test.tsx` is the reference integration test. It:

1. mounts the hook via `renderHook` inside a real `QueryClientProvider`,
2. `vi.mock`s only `@/lib/data/preferences` (the server-fn edge),
3. prefills the `watchlistItems` cache the way a loader would,
4. drives the hook's public API — calls `toggleWatchlist(film)`, then
   asserts `isWatchlisted(id)` flipped optimistically, and on rejection that
   it rolled back.

That is the shape every new Vitest test in this repo should match.

## Consequences

- `CODING_STANDARDS.md` §1 "deferred" note is removed; `/implement` is
  expected to use `/tdd` at the seams above that pass the complex-logic
  gate.
- Test count stays low and proportional to behaviour. Pure-logic modules
  with no integration consumer are not given isolated tests; they are
  covered when (and only when) something renders their output.
- Two test configs to maintain. Accepted: the boundaries they cover are
  disjoint, and dropping either reopens the gap that motivated #77.
- Playwright pulls a one-time browser binary download
  (`npm run e2e:install`). Dev-only; not required for the integration suite.
