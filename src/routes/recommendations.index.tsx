import { createFileRoute } from "@tanstack/react-router";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { UnauthenticatedPrompt } from "@/components/recommendations/unauthenticated-prompt";
import { OnboardingWizard } from "@/components/recommendations/onboarding-wizard";
import { hasSufficientPreferences } from "@/lib/utils/preferences-check";
import { RecommendationsError } from "@/components/recommendations-error";
import { getAllUserContent } from "@/lib/data/preferences";
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
  loader: async () => {
    // Load user preferences only. Recommendations are streamed per-item via
    // the /api/recommendations/stream NDJSON route from the client on mount
    // (Specs 0003, 0006).
    const userPrefs = await getAllUserContent();
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
