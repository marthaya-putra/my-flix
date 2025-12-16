import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Await } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { RecommendationCardSkeleton } from "@/components/recommendation-card-skeleton";
import { FilmInfo } from "@/lib/types";
import { UnauthenticatedPrompt } from "@/components/recommendations/unauthenticated-prompt";
import { OnboardingWizard } from "@/components/recommendations/onboarding-wizard";
import { hasSufficientPreferences } from "@/lib/utils/preferences-check";
import { RecommendationsError } from "@/components/recommendations-error";
import { getAllUserContent } from "@/lib/data/preferences";
import { getRecommendations } from "@/lib/data/recommendations";

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
  errorComponent: RecommendationsError,
  loader: async () => {
    // Load user preferences - auth is handled client-side with AuthContext
    // The middleware still protects this route for SSR

    const userPrefs = await getAllUserContent();
    if (!userPrefs) {
      return {
        userPrefs: null,
        recommendations: Promise.resolve([]),
      };
    }

    // Only generate recommendations if user has sufficient preferences
    if (hasSufficientPreferences(userPrefs)) {
      // Get initial recommendations - don't await for streaming
      const recommendations = getRecommendations({
        data: {
          userPrefs,
          previousRecommendations: [], // Empty for initial load
        },
      });

      return {
        userPrefs,
        recommendations,
      };
    }

    return {
      userPrefs,
      recommendations: Promise.resolve([]),
    };
  },
});

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  imdbRating: number;
  tmdbData: FilmInfo | null;
}

function Recommendations() {
  const { userPrefs, recommendations } = Route.useLoaderData();

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
          <Suspense fallback={<RecommendationCardSkeleton />}>
            <Await
              promise={recommendations}
              children={(recommendationData: Recommendation[]) => (
                <RecommendationsList
                  userPrefs={userPrefs}
                  initialRecommendations={recommendationData}
                />
              )}
            />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
