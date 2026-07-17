// src/routes/__root.tsx
/// <reference types="vite/client" />
import type { ReactNode } from "react";
import {
  Outlet,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
  useRouter,
} from "@tanstack/react-router";
import { QueryClientProvider } from "@tanstack/react-query";
import Navbar from "../components/navbar";
import NotFound from "../components/not-found";
import type { AppRouterContext } from "../router";
import appCss from "../styles/app.css?url";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { sessionQuery } from "@/lib/data/auth";

export const Route = createRootRouteWithContext<AppRouterContext>()({
  // Resolve the session per navigation so it flows into router context.
  // Routed through QueryClient: only the first nav pays the RPC round-trip;
  // subsequent ones reuse the cached session. Runs on the server during SSR
  // and via RPC on client navigations. Login/logout invalidate the cache.
  beforeLoad: async ({ context }) => {
    const session = await context.queryClient.fetchQuery(sessionQuery);
    const isClient = typeof window !== "undefined";
    console.log(
      `[root beforeLoad] ${isClient ? "CLIENT" : "SERVER"} session.user:`,
      session?.user?.email ?? null,
    );
    return { context: { session } };
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "MyFlix",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@500;700;900&display=swap",
      },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: RootComponent,
  notFoundComponent: NotFound,
});

function RootComponent() {
  return (
    <RootDocument>
      <Outlet />
    </RootDocument>
  );
}

function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  const router = useRouter();
  return (
    <QueryClientProvider client={router.options.context.queryClient}>
      <html>
        <head>
          <HeadContent />
        </head>
        <body className="grid grid-rows-[auto_1fr_auto]">
          <TooltipProvider>
            <Navbar />
            {/* Fixed navbar needs top offset on main content */}
            <main className="pt-[72px]">{children}</main>
            <Toaster richColors closeButton position="bottom-right" />
          </TooltipProvider>
          <footer className="py-6 px-4 md:px-12 bg-black/40 border-t border-white/5">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 text-white">
              <div>
                © {new Date().getFullYear()} MyFlix Inc. All rights reserved.
              </div>
              <a
                href="https://github.com/marthaya-putra/my-flix"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
                aria-label="GitHub Repository"
              >
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    fillRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                    clipRule="evenodd"
                  />
                </svg>
                <span className="text-sm">GitHub</span>
              </a>
            </div>
          </footer>
          <Scripts />
        </body>
      </html>
    </QueryClientProvider>
  );
}
