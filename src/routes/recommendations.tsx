import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { UnauthenticatedPrompt } from "@/components/recommendations/unauthenticated-prompt";
import { OnboardingWizard } from "@/components/recommendations/onboarding-wizard";
import { hasSufficientPreferences } from "@/lib/utils/preferences-check";
import { RecommendationsError } from "@/components/recommendations-error";
import { getAllUserContent } from "@/lib/data/preferences";

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
  errorComponent: RecommendationsError,
  loader: async () => {
    // Load user preferences only. Recommendations are streamed per-item via
    // getRecommendationsStream from the client on mount (Spec 0003).
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
          <RecommendationsList userPrefs={userPrefs} />
        </CardContent>
      </Card>
    </div>
  );
}
