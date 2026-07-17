import { redirect } from "@tanstack/react-router";
import type { AppRouterContext } from "@/router";

/**
 * Route guard for authenticated pages. Read the session resolved by
 * the root `beforeLoad` from router context and redirect to /login
 * when there is no user.
 *
 * Use as a route's `beforeLoad`:
 *
 *   beforeLoad: guardAuthenticated
 *
 * This guards the page UI only. Server functions that touch user
 * data still resolve their own session — route guards do not protect
 * RPC endpoints.
 */
export const guardAuthenticated = ({
  context,
}: {
  context: AppRouterContext;
}) => {
  if (!context.session?.user) {
    throw redirect({ to: "/login" });
  }
};
