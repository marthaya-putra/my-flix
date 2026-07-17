## Fix: cache the session RPC so public pages stop blocking

**Root cause** (confirmed): PR #18's root `beforeLoad` calls `fetchSession()` raw on every navigation. TanStack Router runs root `beforeLoad` on every nav, so every page — including public `/movies`, `/tv`, `/` — pays a server-fn RPC round-trip before rendering. That round-trip is the regression behind all 3 symptoms: pending flash on every nav (2), card flicker from re-render churn (3), and sluggish post-login reload (1).

You chose **global + cached**: keep session in context (honors #14 AC) but route the RPC through QueryClient so only the first nav pays.

### Changes (2 files, on branch `feat/auth-beforeload-context-14`)

**1. `src/lib/data/auth.ts`** — add a `sessionQuery` `queryOptions`:
```ts
export const sessionQuery = queryOptions({
  queryKey: ["session"],
  queryFn: () => fetchSession(),
  staleTime: Infinity,
  gcTime: Infinity,
});
```
`staleTime: Infinity` = once resolved, never refetch within the SPA lifetime. `gcTime: Infinity` = never garbage-collect.

**2. `src/routes/__root.tsx`** — `beforeLoad` reads via the QueryClient already in context:
```ts
beforeLoad: async ({ context }) => {
  const session = await context.queryClient.fetchQuery(sessionQuery);
  return { context: { session } };
},
```
`fetchQuery` returns the cached value instantly if present; only the first nav (or after invalidation) hits the RPC.

### Login/logout invalidation (required for correctness)
With `staleTime: Infinity`, the session won't refresh on its own. The login flow (`src/routes/login.tsx` — still using `reloadDocument: true`, which is #13's scope) does a full reload today, so it naturally re-fetches. **No change needed for login in this fix.** If a logout flow exists that does *not* reload, it must call `queryClient.invalidateQueries({ queryKey: ["session"] })` — I'll grep for logout and add the invalidation only if needed.

### Verification
- `npx tsc --noEmit` — 0 new errors in touched files
- `npm run build` — passes
- Push to PR #18 as a follow-up commit
- Manual smoke (yours): navigate public pages — no pending flash after first load, no card flicker; login still works

### Out of scope
- #13 (replace `reloadDocument: true` with `router.invalidate()`) — separate PR. The full reload still works correctly with this caching because a fresh document gets a fresh QueryClient.
- Switching to the lazy/guard-only architecture (my recommendation) — you chose global+cached, so keeping global session.