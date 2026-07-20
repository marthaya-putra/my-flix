import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import AllPreferencesSkeleton from "@/components/skeletons/all-preferences-skeleton";
import { AllPreferencesPage } from "@/components/preferences/all-preferences-page";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userPreferencesOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/preferences/person")({
  component: AllPeopleComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userPreferencesOptions());
  },
});

function AllPeopleComponent() {
  const { data: preferences } = useSuspenseQuery(userPreferencesOptions());

  return (
    <Suspense fallback={<AllPreferencesSkeleton />}>
      <AllPreferencesPage initialPreferences={preferences} category="people" />
    </Suspense>
  );
}
