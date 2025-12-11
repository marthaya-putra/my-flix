import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { Await } from "@tanstack/react-router";
import { loadUserPreferencesFn } from "@/lib/server-functions/user-preferences";
import { getRecommendationsFn } from "@/lib/server-functions/recommendations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Recommendations as RecommendationsList } from "@/components/recommendations";
import { RecommendationCardSkeleton } from "@/components/recommendation-card-skeleton";
import { FilmInfo } from "@/lib/types";



export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
  loader: async () => {
    // Load user preferences
    const userPrefs = await loadUserPreferencesFn();

    // Get initial recommendations - don't await for streaming
    const recommendations = getRecommendationsFn({
      data: {
        userPrefs,
        previousRecommendations: [] // Empty for initial load
      }
    });

    return {
      userPrefs,
      recommendations,
    };
  },
});


interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  tmdbData: FilmInfo | null;
}

function Recommendations() {
  const { userPrefs, recommendations } = Route.useLoaderData();

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
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