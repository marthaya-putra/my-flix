import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilmInfo } from "@/lib/types";
import { RecommendationCard } from "./recommendation-card";
import {
  addMoviePreference,
  removeUserPreferenceByPreferenceId,
  addUserDislikeFn,
  removeUserDislikeByPreferenceIdFn,
} from "@/lib/data/preferences";
import { authClient } from "@/lib/auth-client";
import { getRecommendations } from "@/lib/data/recommendations";

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  imdbRating: number;
  tmdbData: FilmInfo | null;
}

interface UserPreferences {
  movies: Array<{ title: string; year: number }>;
  tvs: Array<{ title: string; year: number }>;
  dislikedMovies: Array<{ title: string; year: number }>;
  dislikedTvs: Array<{ title: string; year: number }>;
  actors: string[];
  directors: string[];
  genres: string[];
}

interface RecommendationsProps {
  userPrefs: UserPreferences;
  initialRecommendations: Recommendation[];
}

export function Recommendations({
  userPrefs,
  initialRecommendations,
}: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    initialRecommendations
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());
  const [addingToPreferences, setAddingToPreferences] = useState<Set<string>>(
    new Set()
  );

  // Get logged-in user ID from auth context
  const { data } = authClient.useSession();
  const userId = data?.user?.id;

  // If user is not authenticated, show message
  if (!userId) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          Please log in to manage your recommendations.
        </p>
      </div>
    );
  }

  const handleLoadMore = async () => {
    setLoadingMore(true);
    setError(null);

    try {
      // Create previous recommendations list from all current recommendations
      const previousRecommendations = recommendations.map((rec) => ({
        title: rec.title,
        year: rec.releasedYear,
        category: rec.category,
      }));

      const newRecommendations = await getRecommendations({
        data: {
          userPrefs,
          previousRecommendations,
        },
      });

      setRecommendations((prev) => [...prev, ...newRecommendations]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load more recommendations";
      setError(errorMessage);
      console.error("Error loading more recommendations:", err);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleLikeRecommendation = async (recommendation: Recommendation) => {
    if (!recommendation.tmdbData) {
      alert("Cannot modify recommendation without TMDB data");
      return;
    }

    const itemKey = `${recommendation.tmdbData.id}`;
    const isCurrentlyLiked = likedItems.has(itemKey);

    setAddingToPreferences((prev) => new Set(prev).add(itemKey));

    try {
      if (isCurrentlyLiked) {
        await removeUserPreferenceByPreferenceId({
          data: {
            preferenceId: recommendation.tmdbData.id,
          },
        });
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      } else {
        await addMoviePreference({
          data: {
            preferenceId: recommendation.tmdbData.id,
            title: recommendation.title,
            year: recommendation.releasedYear,
            category:
              recommendation.category === "movie" ? "movie" : "tv-series",
            posterPath: recommendation.tmdbData.posterPath,
            genres:
              recommendation.tmdbData.genres.length > 0
                ? recommendation.tmdbData.genres.join(", ")
                : undefined,
          },
        });
        setLikedItems((prev) => new Set(prev).add(itemKey));

        // Remove from disliked if it was there
        if (dislikedItems.has(itemKey)) {
          setDislikedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error("Error modifying preferences:", error);
      alert(`Failed to ${isCurrentlyLiked ? "remove" : "add"} to preferences`);
    } finally {
      setAddingToPreferences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleDislikeRecommendation = async (
    recommendation: Recommendation
  ) => {
    if (!recommendation.tmdbData) {
      alert("Cannot modify recommendation without TMDB data");
      return;
    }

    const itemKey = `${recommendation.tmdbData.id}`;
    const isCurrentlyDisliked = dislikedItems.has(itemKey);

    setAddingToPreferences((prev) => new Set(prev).add(itemKey));

    try {
      if (isCurrentlyDisliked) {
        await removeUserDislikeByPreferenceIdFn({
          data: {
            preferenceId: recommendation.tmdbData.id,
          },
        });
        setDislikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      } else {
        await addUserDislikeFn({
          data: {
            preferenceId: recommendation.tmdbData.id,
            title: recommendation.title,
            year: recommendation.releasedYear,
            category:
              recommendation.category === "movie" ? "movie" : "tv-series",
          },
        });
        setDislikedItems((prev) => new Set(prev).add(itemKey));

        // Remove from liked if it was there
        if (likedItems.has(itemKey)) {
          setLikedItems((prev) => {
            const newSet = new Set(prev);
            newSet.delete(itemKey);
            return newSet;
          });
        }
      }
    } catch (error) {
      console.error("Error modifying dislikes:", error);
      alert(`Failed to ${isCurrentlyDisliked ? "remove" : "add"} to dislikes`);
    } finally {
      setAddingToPreferences((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }
  };

  const handleImageError = (key: string) => {
    setImageErrors((prev) => new Set(prev).add(key));
  };

  if (error && recommendations.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">
          No recommendations available. Try adding some movies or TV shows to
          your preferences first!
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="flex flex-wrap gap-4 justify-start">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={`${rec.title}-${rec.releasedYear}-${index}`}
            recommendation={rec}
            likedItems={likedItems}
            dislikedItems={dislikedItems}
            addingToPreferences={addingToPreferences}
            imageErrors={imageErrors}
            onLike={handleLikeRecommendation}
            onDislike={handleDislikeRecommendation}
            onImageError={handleImageError}
          />
        ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleLoadMore}
          disabled={loadingMore}
          variant="outline"
          className="w-sm hover:bg-accent"
        >
          {loadingMore ? "Loading more..." : "Load More Recommendations"}
        </Button>
      </div>
    </div>
  );
}
