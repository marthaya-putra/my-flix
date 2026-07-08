import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { UnauthenticatedPrompt } from "@/components/recommendations/unauthenticated-prompt";
import { OnboardingWizard } from "@/components/recommendations/onboarding-wizard";
import { hasSufficientPreferences } from "@/lib/utils/preferences-check";
import { RecommendationsError } from "@/components/recommendations-error";
import { RecommendationCardSkeleton } from "@/components/recommendation-card-skeleton";
import { getAllUserContent } from "@/lib/data/preferences";

const TARGET_PER_CATEGORY = 3;

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
  errorComponent: RecommendationsError,
  // pendingComponent renders immediately on navigation while the loader
  // resolves, so the user sees skeletons without waiting for the loader +
  // auth check to finish.
  pendingComponent: () => (
    <div className="container mx-auto p-4 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Movie/TV Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 justify-center">
            {Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
              <RecommendationCardSkeleton key={`skel-m-${i}`} count={1} />
            ))}
            {Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
              <RecommendationCardSkeleton key={`skel-t-${i}`} count={1} />
            ))}
          </div>
        </CardContent>
      </Card>
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
  return (
    <div className="container mx-auto p-4 mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Movie/TV Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <RecommendationsList />
        </CardContent>
      </Card>
    </div>
  );
}
