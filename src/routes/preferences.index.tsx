import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { PreferencesPage } from "@/components/preferences/preferences-page";
import PreferencesSkeleton from "@/components/skeletons/preferences-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userPreferencesOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/preferences/")({
  component: PreferencesComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userPreferencesOptions());
  },
  pendingComponent: () => <PreferencesSkeleton />,
});

function PreferencesComponent() {
  const { data: preferences } = useSuspenseQuery(userPreferencesOptions());

  return (
    <Suspense fallback={<PreferencesSkeleton />}>
      <PreferencesPage initialPreferences={preferences} />
    </Suspense>
  );
}
