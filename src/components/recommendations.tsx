import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FilmInfo } from "@/lib/types";
import { RecommendationCard } from "./recommendation-card";
import {
  addUserPreference,
  removeUserPreferenceByPreferenceId,
} from "@/lib/repositories/user-preferences";
import {
  addUserDislike,
  removeUserDislikeByPreferenceId,
} from "@/lib/repositories/user-dislikes";

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  tmdbData: FilmInfo | null;
}

interface RecommendationsProps {
  recommendations: Recommendation[];
  userPrefs: any;
  onLoadMore: () => Promise<Recommendation[]>;
  error: string | null;
}

export function Recommendations({
  recommendations,
  userPrefs,
  onLoadMore,
  error,
}: RecommendationsProps) {
  const [allRecommendations, setAllRecommendations] =
    useState<Recommendation[]>(recommendations);
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());
  const [addingToPreferences, setAddingToPreferences] = useState<Set<string>>(
    new Set()
  );

  // Hardcoded user ID for testing - in real app, get from auth context
  const userId = "default-user";

  const handleLoadMore = async () => {
    setLoading(true);
    try {
      const newRecommendations = await onLoadMore();
      setAllRecommendations((prev) => [...prev, ...newRecommendations]);
    } finally {
      setLoading(false);
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
            userId,
            preferenceId: recommendation.tmdbData.id,
          },
        });
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      } else {
        await addUserPreference({
          data: {
            userId,
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
        await removeUserDislikeByPreferenceId({
          data: {
            userId,
            preferenceId: recommendation.tmdbData.id,
          },
        });
        setDislikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
      } else {
        await addUserDislike({
          data: {
            userId,
            preferenceId: recommendation.tmdbData.id,
            title: recommendation.title,
            year: recommendation.releasedYear,
            category:
              recommendation.category === "movie" ? "movie" : "tv-series",
          },
        });
        setDislikedItems((prev) => new Set(prev).add(itemKey));

        await removeUserPreferenceByPreferenceId({
          data: {
            userId,
            preferenceId: recommendation.tmdbData.id,
          },
        });
        setLikedItems((prev) => {
          const newSet = new Set(prev);
          newSet.delete(itemKey);
          return newSet;
        });
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

  if (allRecommendations.length === 0) {
    return null;
  }

  return (
    <div>
      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      <div className="grid gap-6 grid-cols-1">
        {allRecommendations.map((rec, index) => (
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

      <div className="mt-6">
        <Button
          onClick={handleLoadMore}
          disabled={loading}
          variant="outline"
          className="w-full"
        >
          {loading ? "Loading more..." : "Load More Recommendations"}
        </Button>
      </div>
    </div>
  );
}
