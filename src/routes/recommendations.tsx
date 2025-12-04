import { createFileRoute } from "@tanstack/react-router";
import { getRecommendations } from "@/lib/ai/test-fn";
import { getUserPreferences } from "@/lib/repositories/user-preferences";
import { getUserPeople } from "@/lib/repositories/user-people";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
});

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
}

function Recommendations() {
  const [allRecommendations, setAllRecommendations] = useState<
    Recommendation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Hardcoded user ID for testing - in real app, get from auth context
  const userId = "default-user";

  const loadUserPreferences = async () => {
    try {
      const [preferencesResponse, peopleResponse] = await Promise.all([
        getUserPreferences({ data: { userId } }),
        getUserPeople({ data: { userId } }),
      ]);

      const preferences = preferencesResponse.success
        ? preferencesResponse.preferences
        : [];
      const people = peopleResponse.success ? peopleResponse.people : [];

      // Extract genres from preferences
      const allGenres = preferences
        .filter((p) => p.genres)
        .map((p) => p.genres!.split(',').map((genre) => genre.trim()))
        .flat()
        .filter((genre) => genre.length > 0);

      // Remove duplicates
      const uniqueGenres = [...new Set(allGenres)];

      return {
        movies: preferences
          .filter((p) => p.category === "movie")
          .map((p) => ({
            title: p.title,
            year: p.year,
          })),
        tvs: preferences
          .filter((p) => p.category === "tv-series")
          .map((p) => ({
            title: p.title,
            year: p.year,
          })),
        actors: people
          .filter((p) => p.personType === "actor")
          .map((p) => p.personName),
        directors: people
          .filter((p) => p.personType === "director")
          .map((p) => p.personName),
        genres: uniqueGenres,
      };
    } catch (error) {
      console.error("Failed to load user preferences:", error);
      return {
        movies: [],
        tvs: [],
        actors: [],
        directors: [],
        genres: [],
      };
    }
  };

  const getRecommendationsHandler = async () => {
    setLoading(true);
    setError(null);

    try {
      const userPrefs = await loadUserPreferences();

      const result = await getRecommendations({
        data: {
          previouslyLikedMovies: userPrefs.movies,
          previouslyLikedTvs: userPrefs.tvs,
          favoriteActors: userPrefs.actors,
          favoriteDirectors: userPrefs.directors,
          genres: userPrefs.genres,
          excludeAdult: true,
          previousRecommendations: allRecommendations.map((rec) => ({
            title: rec.title,
            year: rec.releasedYear,
            category: rec.category,
          })),
        },
      });

      if (result.success) {
        setAllRecommendations((prev) => [
          ...prev,
          ...result.data.recommendations,
        ]);
      } else {
        setError(result.error || "Failed to get recommendations");
      }
    } catch (error) {
      setError(
        `Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setLoading(false);
    }
  };

  const resetRecommendations = () => {
    setAllRecommendations([]);
    setError(null);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl mt-8">
      <Card>
        <CardHeader>
          <CardTitle>AI Movie/TV Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Actions */}
          <div className="flex gap-4">
            <Button
              onClick={getRecommendationsHandler}
              disabled={loading}
              className="min-w-[140px]"
            >
              {loading ? "Getting recommendations..." : "Get Recommendations"}
            </Button>

            {allRecommendations.length > 0 && (
              <Button
                variant="outline"
                onClick={resetRecommendations}
                disabled={loading}
              >
                Reset
              </Button>
            )}
          </div>

          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Recommendations Display */}
          {allRecommendations.length > 0 && (
            <div>
              <h3 className="font-semibold mb-4">Recommended for You:</h3>
              <div className="grid gap-4">
                {allRecommendations.map((rec, index) => (
                  <Card
                    key={`${rec.title}-${rec.releasedYear}-${index}`}
                    className="p-4"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-lg">{rec.title}</h4>
                      <div className="flex gap-2">
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          {rec.category === "movie" ? "Movie" : "TV Series"}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded">
                          {rec.releasedYear}
                        </span>
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {rec.reason}
                    </p>
                  </Card>
                ))}
              </div>

              {/* Load More Button */}
              <div className="mt-6">
                <Button
                  onClick={getRecommendationsHandler}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading ? "Loading more..." : "Load More Recommendations"}
                </Button>
              </div>
            </div>
          )}

          {/* Empty State */}
          {allRecommendations.length === 0 && !loading && !error && (
            <div className="text-center py-8 text-gray-500">
              <p>
                No recommendations yet. Click "Get Recommendations" to see
                personalized suggestions!
              </p>
            </div>
          )}

          {/* Stats */}
          {allRecommendations.length > 0 && (
            <div className="text-sm text-gray-500 text-center">
              Total recommendations received: {allRecommendations.length}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
