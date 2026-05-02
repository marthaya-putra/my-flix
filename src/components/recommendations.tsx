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

// Type for the structure expected by this component
interface RecommendationsUserPrefs {
  movies: Array<{ title: string; year: number }>;
  tvs: Array<{ title: string; year: number }>;
  dislikedMovies: Array<{ title: string; year: number }>;
  dislikedTvs: Array<{ title: string; year: number }>;
  actors: string[];
  directors: string[];
  genres: string[];
}

interface RecommendationsProps {
  userPrefs: RecommendationsUserPrefs;
  initialRecommendations: Recommendation[];
}

export function Recommendations({
  userPrefs,
  initialRecommendations,
}: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>(
    initialRecommendations,
  );
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());

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
    const currentlyLiked = likedItems.has(itemKey);
    const currentlyDisliked = dislikedItems.has(itemKey);

    // Optimistic update - update UI immediately
    setLikedItems((prev) => {
      const newSet = new Set(prev);
      if (currentlyLiked) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });

    // If liking, also optimistically remove from disliked
    if (!currentlyLiked && currentlyDisliked) {
      setDislikedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }

    try {
      if (currentlyLiked) {
        await removeUserPreferenceByPreferenceId({
          data: {
            preferenceId: recommendation.tmdbData.id,
          },
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
      }
    } catch (error) {
      console.error("Error modifying preferences:", error);
      // Revert optimistic update on error
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (currentlyLiked) {
          newSet.add(itemKey);
        } else {
          newSet.delete(itemKey);
        }
        return newSet;
      });
      // Revert disliked state if needed
      if (!currentlyLiked && currentlyDisliked) {
        setDislikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.add(itemKey);
          return newSet;
        });
      }
      alert(`Failed to ${currentlyLiked ? "remove" : "add"} to preferences`);
    }
  };

  const handleDislikeRecommendation = async (
    recommendation: Recommendation,
  ) => {
    if (!recommendation.tmdbData) {
      alert("Cannot modify recommendation without TMDB data");
      return;
    }

    const itemKey = `${recommendation.tmdbData.id}`;
    const currentlyDisliked = dislikedItems.has(itemKey);
    const currentlyLiked = likedItems.has(itemKey);

    // Optimistic update - update UI immediately
    setDislikedItems((prev) => {
      const newSet = new Set(prev);
      if (currentlyDisliked) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });

    // If disliking, also optimistically remove from liked
    if (!currentlyDisliked && currentlyLiked) {
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        newSet.delete(itemKey);
        return newSet;
      });
    }

    try {
      if (currentlyDisliked) {
        await removeUserDislikeByPreferenceIdFn({
          data: {
            preferenceId: recommendation.tmdbData.id,
          },
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
      }
    } catch (error) {
      console.error("Error modifying dislikes:", error);
      // Revert optimistic update on error
      setDislikedItems((prev) => {
        const newSet = new Set(prev);
        if (currentlyDisliked) {
          newSet.add(itemKey);
        } else {
          newSet.delete(itemKey);
        }
        return newSet;
      });
      // Revert liked state if needed
      if (!currentlyDisliked && currentlyLiked) {
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.add(itemKey);
          return newSet;
        });
      }
      alert(`Failed to ${currentlyDisliked ? "remove" : "add"} to dislikes`);
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

      <div className="flex flex-wrap gap-4 justify-center">
        {recommendations.map((rec, index) => (
          <RecommendationCard
            key={`${rec.title}-${rec.releasedYear}-${index}`}
            recommendation={rec}
            likedItems={likedItems}
            dislikedItems={dislikedItems}
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
