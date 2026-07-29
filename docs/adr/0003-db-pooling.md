# Shared pooled DB client (not per-call clients)

`getDb()` used to construct a **fresh `postgres.js` client on every call** —
each with its own internal pool (`max: 10`) and none ever closed. A no-op
`closeConnection` was defined but never invoked, so every client lived only
until the driver's 20s `idle_timeout` reaped its socket. Under sustained load
this raced connection exhaustion against the idle timer.

The `auth` export amplified the problem: a `Proxy` around the better-auth
instance called `getAuth()` → `getDb()` on **every property access**, so a
single `auth.api.getSession(...)` constructed several throwaway clients.

We replaced both with a single **module-level pooled singleton**: one
`postgres(connectionString, { ... })` wrapped in `drizzle(...)`, cached on
`globalThis` to survive dev HMR without leaking sockets. `auth` is built once
over that same singleton; the per-access Proxy is gone.

## Why pooling is safe for request isolation

The previous per-call pattern existed to avoid "I/O sharing across requests"
for the better-auth DB adapter. That concern does not require per-call client
construction: `postgres.js` returns a pooled connection by default, and each
query checks out an **independent connection** from the shared pool. Concurrent
requests therefore never share query state — isolation is per-query, not
per-client. A single shared pool is strictly better: bounded connection count,
no socket churn, and the `max: 10` cap now applies globally instead of per
throwaway client.

## Consequences

- `db` is imported directly (`import { db } from "@/lib/db"`) or via `getDb()`,
  which now just returns the singleton. Existing call sites are unchanged.
- `getAuth()` and the `auth` Proxy are removed; consumers use `auth` directly.
- `closeConnection` is deleted (dead code, no callers, and closing a shared
  pool mid-request would break everything).
- `CODING_STANDARDS.md` §7 now mandates the pooled singleton and links here.
- If request-scoped state ever needs to ride on the DB (e.g. a transaction or
  tenant header), scope it at the query level, not by spawning a client.
