import { createFileRoute } from "@tanstack/react-router";
import { getRecommendations } from "@/lib/ai/recommendations";
import {
  getUserPreferences,
  addUserPreference,
} from "@/lib/repositories/user-preferences";
import { getUserPeople } from "@/lib/repositories/user-people";
import { enrichRecommendationsWithTMDB } from "@/lib/data/recommendations";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FilmInfo } from "@/lib/types";
import { Heart } from "lucide-react";

export const Route = createFileRoute("/recommendations")({
  component: Recommendations,
});

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  tmdbData: FilmInfo | null;
}

function Recommendations() {
  const [allRecommendations, setAllRecommendations] = useState<
    Recommendation[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [lovedItems, setLovedItems] = useState<Set<string>>(new Set());
  const [addingToPreferences, setAddingToPreferences] = useState<Set<string>>(
    new Set()
  );

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
        .map((p) => p.genres!.split(",").map((genre) => genre.trim()))
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
        // Enrich recommendations with TMDB data
        const enrichedRecommendations = await enrichRecommendationsWithTMDB({
          data: result.data.recommendations,
        });

        setAllRecommendations((prev) => [...prev, ...enrichedRecommendations]);
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

  const handleLoveRecommendation = async (recommendation: Recommendation) => {
    if (!recommendation.tmdbData) {
      alert("Cannot add recommendation without TMDB data");
      return;
    }

    const itemKey = `${recommendation.tmdbData.id}-${recommendation.category}`;

    if (lovedItems.has(itemKey)) {
      return; // Already loved
    }

    // Add to loading state
    setAddingToPreferences((prev) => new Set(prev).add(itemKey));

    try {
      const result = await addUserPreference({
        data: {
          userId,
          preferenceId: recommendation.tmdbData.id,
          title: recommendation.title,
          year: recommendation.releasedYear,
          category: recommendation.category === "movie" ? "movie" : "tv-series",
          posterPath: recommendation.tmdbData.posterPath,
          genres:
            recommendation.tmdbData.genres.length > 0
              ? recommendation.tmdbData.genres.join(", ")
              : undefined,
        },
      });

      if (result.success) {
        setLovedItems((prev) => new Set(prev).add(itemKey));
      } else {
        alert("Failed to add to preferences");
      }
    } catch (error) {
      console.error("Error adding to preferences:", error);
      alert("Failed to add to preferences");
    } finally {
      // Remove from loading state
      setAddingToPreferences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
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
              <div className="grid gap-6 grid-cols-1">
                {allRecommendations.map((rec, index) => (
                  <Card
                    key={`${rec.title}-${rec.releasedYear}-${index}`}
                    className="overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="flex flex-col sm:flex-row">
                      {/* Poster Image */}
                      <div className="relative w-full sm:w-48 aspect-[2/3] sm:aspect-auto bg-muted">
                        {rec.tmdbData?.posterPath &&
                        !imageErrors.has(`${rec.title}-${rec.releasedYear}`) ? (
                          <img
                            src={rec.tmdbData.posterPath}
                            alt={`${rec.title} poster`}
                            className="w-full h-full object-cover"
                            onError={() => {
                              setImageErrors((prev) =>
                                new Set(prev).add(
                                  `${rec.title}-${rec.releasedYear}`
                                )
                              );
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                            <div className="text-center p-4">
                              <div className="text-4xl mb-2">🎬</div>
                              <p className="text-sm">No poster available</p>
                            </div>
                          </div>
                        )}

                        {/* Category and Year Badge */}
                        <div className="absolute top-2 right-2 flex gap-1">
                          <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                            {rec.category === "movie" ? "Movie" : "TV"}
                          </span>
                          <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
                            {rec.releasedYear}
                          </span>
                        </div>

                        {/* Rating Badge */}
                        {rec.tmdbData?.voteAverage && (
                          <div className="absolute top-2 left-2">
                            <span className="px-2 py-1 bg-yellow-600/90 text-white text-xs rounded flex items-center gap-1">
                              ⭐ {rec.tmdbData.voteAverage.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <CardContent className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-3">
                          <h4 className="font-semibold text-xl">{rec.title}</h4>
                          {rec.tmdbData && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleLoveRecommendation(rec)}
                              disabled={
                                lovedItems.has(
                                  `${rec.tmdbData.id}-${rec.category}`
                                ) ||
                                addingToPreferences.has(
                                  `${rec.tmdbData.id}-${rec.category}`
                                )
                              }
                              className="p-2 h-8 w-8"
                            >
                              <Heart
                                className={`h-4 w-4 ${
                                  lovedItems.has(
                                    `${rec.tmdbData.id}-${rec.category}`
                                  )
                                    ? "fill-red-500 text-red-500"
                                    : "text-gray-400 hover:text-red-500"
                                }`}
                              />
                            </Button>
                          )}
                        </div>

                        {/* Recommendation Reason */}
                        <div className="mb-4">
                          <p className="text-sm text-blue-600 font-medium mb-2">
                            Why you'll like it:
                          </p>
                          <p className="text-muted-foreground text-sm leading-relaxed">
                            {rec.reason}
                          </p>
                        </div>

                        {/* Additional TMDB Details */}
                        {rec.tmdbData?.overview && (
                          <div>
                            <p className="text-sm text-gray-600 font-medium mb-2">
                              Overview:
                            </p>
                            <p className="text-muted-foreground text-xs leading-relaxed line-clamp-4">
                              {rec.tmdbData.overview}
                            </p>
                          </div>
                        )}

                        {!rec.tmdbData && (
                          <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
                            ℹ️ TMDB data not available for this recommendation
                          </div>
                        )}
                      </CardContent>
                    </div>
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
