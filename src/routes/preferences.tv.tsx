import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import AllPreferencesSkeleton from "@/components/skeletons/all-preferences-skeleton";
import { AllPreferencesPage } from "@/components/preferences/all-preferences-page";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userPreferencesOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/preferences/tv")({
  component: AllTvShowsComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userPreferencesOptions());
  },
});

function AllTvShowsComponent() {
  const { data: preferences } = useSuspenseQuery(userPreferencesOptions());

  return (
    <Suspense fallback={<AllPreferencesSkeleton titleWidth="w-36" />}>
      <AllPreferencesPage initialPreferences={preferences} category="tvShows" />
    </Suspense>
  );
}
