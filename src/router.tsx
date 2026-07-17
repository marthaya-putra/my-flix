// src/router.tsx
import { createRouter } from "@tanstack/react-router";
import { QueryClient } from "@tanstack/react-query";
import { routeTree } from "./routeTree.gen";
import { DefaultPendingComponent } from "./components/default-pending";
import { DefaultErrorComponent } from "./components/default-error";

/**
 * Router context shape threaded through every route via
 * `Route.useRouteContext()`. Subsequent issues add `session` here.
 *
 * NOTE: keep this type as the single source of truth for what the
 * root route exposes to descendants.
 */
export interface AppRouterContext {
  queryClient: QueryClient;
}

/**
 * Fresh QueryClient per call. On the server, `getRouter` runs per
 * request, so each request gets an isolated cache. On the client,
 * `getRouter` runs once and the same instance is reused for the
 * session.
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Conservative default; individual routes/queries override as needed.
        staleTime: 30_000,
      },
    },
  });
}

export function getRouter() {
  const queryClient = makeQueryClient();

  const router = createRouter({
    routeTree,
    scrollRestoration: true,
    context: { queryClient },
    defaultPreload: "intent",
    defaultPendingComponent: DefaultPendingComponent,
    defaultErrorComponent: DefaultErrorComponent,
  });

  return router;
}

// Register so `Register['router']` reflects the context type.
declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
