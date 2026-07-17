import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

/**
 * Resolve the better-auth session from the current request.
 *
 * Runs on the server during SSR and via RPC on client navigations —
 * server-side in both cases, so no session header is ever exposed to
 * the client bundle.
 */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const session = await auth.api.getSession({
      headers: getRequest().headers,
    });
    console.log("[fetchSession] server resolved session.user:", session?.user?.email ?? null);
    return session;
  },
);

/**
 * Query key for the cached session. Exported so login/logout flows
 * can invalidate it after an auth state change.
 */
export const SESSION_QUERY_KEY = ["session"] as const;

/**
 * Cached session read. The root `beforeLoad` runs on every navigation,
 * so routing the RPC through QueryClient (with infinite staleTime) means
 * only the first nav per SPA lifetime pays the round-trip — subsequent
 * navigations (including to public pages) reuse the cached session and
 * don't block the render.
 *
 * Auth state changes (login/logout) MUST call
 * `queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })`,
 * otherwise the stale session would persist for the SPA lifetime.
 */
export const sessionQuery = queryOptions({
  queryKey: SESSION_QUERY_KEY,
  queryFn: () => fetchSession(),
  staleTime: Infinity,
  gcTime: Infinity,
});

