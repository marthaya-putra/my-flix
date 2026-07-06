import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { FilmInfo } from "@/lib/types";
import { RecommendationCard } from "./recommendation-card";
import { RecommendationCardSkeleton } from "./recommendation-card-skeleton";
import {
  addMoviePreference,
  removeUserPreferenceByPreferenceId,
  addUserDislikeFn,
  removeUserDislikeByPreferenceIdFn,
} from "@/lib/data/preferences";
import { authClient } from "@/lib/auth-client";
import { getRecommendations } from "@/lib/data/recommendations";

// Loop config: deficit-incremental, stateless, capped.
const TARGET_PER_CATEGORY = 3;
const MAX_ROUNDS = 5;
// Over-ask buffer: LLM returns more than the deficit so the ID filter has
// spares to survive collisions against the (large) exclude set. Client
// truncates appended survivors to preserve the 3/3 split.
const OVERASK_BUFFER = 2;

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

  // Loop bookkeeping: round count + settled flag. Loop is gated on
  // "not yet reached target count" and "rounds remaining".
  const [loopRound, setLoopRound] = useState(1); // round 1 = initial load
  const [loopPending, setLoopPending] = useState(false);
  const [loopSettled, setLoopSettled] = useState(false);
  const loopInFlight = useRef(false); // guards against StrictMode double-fire

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

  // Count survivors per category to compute deficit.
  const categoryCount = (cat: "movie" | "tv") =>
    recommendations.filter((r) => r.category === cat).length;

  // Stateless exclude set: liked ∪ disliked ∪ previous-shown, ID-keyed.
  const buildPreviousWithIds = (): Array<{
    id?: number;
    title: string;
    year: number;
    category: "movie" | "tv";
  }> =>
    recommendations
      .filter((r) => r.tmdbData)
      .map((r) => ({
        id: r.tmdbData!.id,
        title: r.title,
        year: r.releasedYear,
        category: r.category,
      }));

  // Auto-backfill loop: fires rounds 2..MAX_ROUNDS on mount when survivors < 6,
  // appends survivors incrementally (no full re-render flicker).
  useEffect(() => {
    if (loopInFlight.current) return;
    if (loopSettled) return;
    if (loopRound >= MAX_ROUNDS) {
      setLoopSettled(true);
      return;
    }
    const movieDeficit = TARGET_PER_CATEGORY - categoryCount("movie");
    const tvDeficit = TARGET_PER_CATEGORY - categoryCount("tv");
    if (movieDeficit <= 0 && tvDeficit <= 0) {
      setLoopSettled(true);
      return;
    }
    if (movieDeficit <= 0 || tvDeficit <= 0) {
      // One category satisfied — preserve 3/3 by still asking only for the
      // deficit side. Cap exhaustion accepts imbalance.
    }

    loopInFlight.current = true;
    setLoopPending(true);

    (async () => {
      try {
        // Over-ask each deficit side by OVERASK_BUFFER so the ID filter has
        // spares when the LLM collides with the exclude set. Client truncates
        // survivors to preserve the 3/3 split.
        const askMovies =
          movieDeficit > 0 ? movieDeficit + OVERASK_BUFFER : 0;
        const askTvs = tvDeficit > 0 ? tvDeficit + OVERASK_BUFFER : 0;

        const newRecs = await getRecommendations({
          data: {
            userPrefs,
            previousRecommendations: buildPreviousWithIds(),
            requestedMovies: askMovies,
            requestedTvs: askTvs,
          },
        });

        // Truncate survivors per category to the deficit — never overshoot 3/3.
        let addedMovies = 0;
        let addedTvs = 0;
        const capped = newRecs.filter((r) => {
          if (r.category === "movie") {
            if (addedMovies < movieDeficit) {
              addedMovies++;
              return true;
            }
            return false;
          }
          if (addedTvs < tvDeficit) {
            addedTvs++;
            return true;
          }
          return false;
        });

        setRecommendations((prev) => [...prev, ...capped]);
        setLoopRound((r) => r + 1);
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : "Failed to load more recommendations";
        setError(errorMessage);
        console.error("Backfill loop error:", err);
        setLoopSettled(true); // bail to avoid tight error loop
      } finally {
        setLoopPending(false);
        loopInFlight.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loopRound, loopSettled, recommendations]);

  const handleLoadMore = async () => {
    if (loopPending) return; // disabled while pending
    setLoadingMore(true);
    setError(null);

    try {
      // Fresh deficit (3/3) after settled — over-ask to survive collisions,
      // truncate to 3/3. Resets loop bookkeeping so the loop re-engages to
      // backfill any shortfall from this batch.
      const previousRecommendations = buildPreviousWithIds();
      const newRecommendations = await getRecommendations({
        data: {
          userPrefs,
          previousRecommendations,
          requestedMovies: TARGET_PER_CATEGORY + OVERASK_BUFFER,
          requestedTvs: TARGET_PER_CATEGORY + OVERASK_BUFFER,
        },
      });

      let addedMovies = 0;
      let addedTvs = 0;
      const capped = newRecommendations.filter((r) => {
        if (r.category === "movie") {
          if (addedMovies < TARGET_PER_CATEGORY) {
            addedMovies++;
            return true;
          }
          return false;
        }
        if (addedTvs < TARGET_PER_CATEGORY) {
          addedTvs++;
          return true;
        }
        return false;
      });

      setRecommendations((prev) => [...prev, ...capped]);
      // Re-arm loop for the new batch: next round = 2, fresh settled=false.
      setLoopRound(1);
      setLoopSettled(false);
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

        {/* Backfill placeholder: skeleton cards for outstanding deficit */}
        {loopPending &&
          Array.from({
            length: Math.max(
              0,
              TARGET_PER_CATEGORY - categoryCount("movie"),
            ),
          }).map((_, i) => (
            <RecommendationCardSkeleton key={`loop-skel-m-${i}`} count={1} />
          ))}
        {loopPending &&
          Array.from({
            length: Math.max(
              0,
              TARGET_PER_CATEGORY - categoryCount("tv"),
            ),
          }).map((_, i) => (
            <RecommendationCardSkeleton key={`loop-skel-t-${i}`} count={1} />
          ))}
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleLoadMore}
          disabled={loadingMore || loopPending}
          variant="outline"
          className="w-sm hover:bg-accent"
        >
          {loadingMore || loopPending
            ? "Loading more..."
            : "Load More Recommendations"}
        </Button>
      </div>
    </div>
  );
}
