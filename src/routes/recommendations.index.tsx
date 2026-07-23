import { createFileRoute } from "@tanstack/react-router";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { UnauthenticatedPrompt } from "@/components/recommendations/unauthenticated-prompt";
import { OnboardingWizard } from "@/components/recommendations/onboarding-wizard";
import { hasSufficientPreferences } from "@/lib/utils/preferences-check";
import { RecommendationsError } from "@/components/recommendations-error";
import { getAllUserContent } from "@/lib/data/preferences";
import {
  likedItemsOptions,
  dislikedItemsOptions,
  watchlistItemsOptions,
} from "@/lib/queries/preferences";
import { InitialLoadComposition } from "@/components/recommendations/initial-load-composition";

export const Route = createFileRoute("/recommendations/")({
  component: Recommendations,
  errorComponent: RecommendationsError,
  // Render the same DOM shape as the resolved component (two category
  // sections: header + stage label) so the loader→component transition
  // has zero layout shift.
  pendingComponent: () => (
    <div className="space-y-8">
      {(["Movies", "TV"] as const).map((label) => (
        <div key={label} className="space-y-3">
          <h2 className="text-lg md:text-xl font-display font-semibold text-white">
            {label}
          </h2>
          <InitialLoadComposition />
        </div>
      ))}
    </div>
  ),
  loader: async ({ context }) => {
    // Load user preferences + the canonical liked/disliked ID lists.
    // The latter two populate the QueryClient cache so the client's first
    // render sees the same liked/disliked state the server does — without
    // it, the first like on an already-liked card calls addMoviePreference
    // (a server no-op) and appears to do nothing. Recommendations
    // themselves are streamed per-item via /api/recommendations/stream
    // from the client on mount (Specs 0003, 0006).
    const [userPrefs] = await Promise.all([
      getAllUserContent(),
      context.queryClient.ensureQueryData(likedItemsOptions()),
      context.queryClient.ensureQueryData(dislikedItemsOptions()),
      context.queryClient.ensureQueryData(watchlistItemsOptions()),
    ]);
    return { userPrefs };
  },
});

function Recommendations() {
  const { userPrefs } = Route.useLoaderData();

  // Case 1: User is not authenticated
  if (!userPrefs) {
    return <UnauthenticatedPrompt />;
  }

  // Case 2: User is authenticated but has insufficient preferences (new user)
  if (!hasSufficientPreferences(userPrefs)) {
    return <OnboardingWizard />;
  }

  // Case 3: User has sufficient preferences - show recommendations
  return <RecommendationsList />;
}
