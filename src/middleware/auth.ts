import { auth } from "@/lib/auth";
import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";

export const authMiddleware = createMiddleware().server(
  async ({ next, request }) => {
    const session = await auth.api.getSession({ headers: request.headers });

    return next({ context: session });
  }
);

export const onlyLoggedIn = createMiddleware()
  .middleware([authMiddleware])
  .server(async ({ next, context }) => {
    const session = context;

    if (!session) {
      throw redirect({ to: "/login" });
    }

    return next();
  }
);
