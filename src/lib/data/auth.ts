import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth";

/**
 * Resolve the better-auth session from the current request.
 *
 * Used by the root `beforeLoad` so session flows into router context
 * type-safely. Runs on the server during SSR and via RPC on client
 * navigations — server-side in both cases, so no session header is
 * ever exposed to the client bundle.
 */
export const fetchSession = createServerFn({ method: "GET" }).handler(
  async () => {
    return await auth.api.getSession({ headers: getRequest().headers });
  },
);
