import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Suspense } from "react";
import { PreferencesShell } from "@/components/preferences/preferences-shell";
import { PreferencesSkeleton } from "@/components/skeletons/preferences-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userPreferencesOptions } from "@/lib/queries/preferences";

/**
 * Layout route for the /preferences section.
 *
 * Single source of auth guard + data prefetch for all child routes
 * (preferences.index, preferences.movie, preferences.tv, preferences.person).
 * The shell (header, segmented sub-nav, global Add) renders once and the
 * children stream into <Outlet />.
 */
export const Route = createFileRoute("/preferences")({
  component: PreferencesLayoutComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userPreferencesOptions());
  },
  pendingComponent: () => <PreferencesSkeleton />,
});

function PreferencesLayoutComponent() {
  // Prime the cache via suspense so the shell renders with data ready. The
  // shell's usePreferences() then reads the same cache (Issue #80) — no prop
  // threading, single source of truth.
  useSuspenseQuery(userPreferencesOptions());

  return (
    <PreferencesShell>
      <Suspense fallback={<PreferencesSkeleton />}>
        <Outlet />
      </Suspense>
    </PreferencesShell>
  );
}
