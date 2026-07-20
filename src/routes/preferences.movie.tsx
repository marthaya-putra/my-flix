import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import AllPreferencesSkeleton from "@/components/skeletons/all-preferences-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { AllPreferencesPage } from "@/components/preferences/all-preferences-page";
import { userPreferencesOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/preferences/movie")({
  component: AllMoviesComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userPreferencesOptions());
  },
});

function AllMoviesComponent() {
  const { data: preferences } = useSuspenseQuery(userPreferencesOptions());

  return (
    <Suspense fallback={<AllPreferencesSkeleton />}>
      <AllPreferencesPage initialPreferences={preferences} category={"movies"} />
    </Suspense>
  );
}
