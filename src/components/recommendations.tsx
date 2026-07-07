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
import { getRecommendationsStream } from "@/lib/data/recommendations";

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
}

export function Recommendations({ userPrefs }: RecommendationsProps) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());

  // Loop state: pending drives skeleton/button UI; settled gates the empty
  // state. Round count is local to runBackfill — no self-retriggering effect.
  const [loopPending, setLoopPending] = useState(true);
  const [loopSettled, setLoopSettled] = useState(false);
  // Guards against StrictMode's double-invoked mount effect: only one
  // runBackfill in flight at a time, so dev mode doesn't fire two concurrent
  // streams against the same empty exclude set.
  const backfillInFlight = useRef(false);

  // Get logged-in user ID from auth context. NOTE: all hooks below
  // (useEffect) must run unconditionally — auth early-return is moved
  // past them to keep hook order stable across the session-load render.
  const { data, isPending: sessionPending } = authClient.useSession();
  const userId = data?.user?.id;

  // Count survivors per category to compute deficit.
  const categoryCount = (cat: "movie" | "tv") =>
    recommendations.filter((r) => r.category === cat).length;

  // Stateless exclude set: liked ∪ disliked ∪ previous-shown, ID-keyed.
  const buildPreviousWithIds = (
    recs: Recommendation[],
  ): Array<{
    id?: number;
    title: string;
    year: number;
    category: "movie" | "tv";
  }> =>
    recs
      .filter((r) => r.tmdbData)
      .map((r) => ({
        id: r.tmdbData!.id,
        title: r.title,
        year: r.releasedYear,
        category: r.category,
      }));

  // Deficit-incremental backfill: fire up to MAX_ROUNDS stream calls, append
  // survivors per-item, stop once 3/3 is satisfied. Runs as one async loop
  // driven by local counts — no self-retriggering effect, no ref bookkeeping.
  // `seed` lets Load More resume from the existing shown set. The
  // backfillInFlight ref dedups StrictMode's double-invoked mount effect:
  // the first call runs to completion, the second is a no-op.
  const runBackfill = async (seed: Recommendation[] = []) => {
    if (backfillInFlight.current) return;
    backfillInFlight.current = true;
    setLoopPending(true);
    setError(null);
    const local: Recommendation[] = [...seed];

    try {
      for (let round = 1; round <= MAX_ROUNDS; round++) {
        const movieDeficit =
          TARGET_PER_CATEGORY -
          local.filter((r) => r.category === "movie").length;
        const tvDeficit =
          TARGET_PER_CATEGORY - local.filter((r) => r.category === "tv").length;
        if (movieDeficit <= 0 && tvDeficit <= 0) break;

        try {
          // Over-ask each deficit side by OVERASK_BUFFER so the ID filter has
          // spares when the LLM collides with the exclude set. Client truncates
          // survivors to preserve the 3/3 split.
          const askMovies =
            movieDeficit > 0 ? movieDeficit + OVERASK_BUFFER : 0;
          const askTvs = tvDeficit > 0 ? tvDeficit + OVERASK_BUFFER : 0;

          const stream = await getRecommendationsStream({
            data: {
              userPrefs,
              previousRecommendations: buildPreviousWithIds(local),
              requestedMovies: askMovies,
              requestedTvs: askTvs,
            },
          });
          const startMovies = local.filter(
            (r) => r.category === "movie",
          ).length;
          const startTvs = local.filter((r) => r.category === "tv").length;
          let addedMovies = 0;
          let addedTvs = 0;
          for await (const rec of stream) {
            if (rec.category === "movie") {
              if (startMovies + addedMovies >= TARGET_PER_CATEGORY) continue;
              addedMovies++;
            } else {
              if (startTvs + addedTvs >= TARGET_PER_CATEGORY) continue;
              addedTvs++;
            }
            local.push(rec as Recommendation);
            setRecommendations((prev) => [...prev, rec as Recommendation]);
          }
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
          const errorMessage =
            err instanceof Error
              ? err.message
              : "Failed to load more recommendations";
          setError(errorMessage);
          console.error("Backfill loop error:", err);
          break; // bail to avoid tight error loop
        }
      }

      setLoopPending(false);
      setLoopSettled(true);
    } finally {
      backfillInFlight.current = false;
    }
  };

  // Single external trigger: session id. Once we have it, fire the loop.
  useEffect(() => {
    if (!userId) return;
    void runBackfill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // If session is still loading, show skeletons (avoids the auth
  // early-return flashing the "please log in" message on first paint).
  // Truly-unauthenticated case is handled below once pending clears.
  if (sessionPending) {
    return (
      <div className="flex flex-wrap gap-4 justify-center">
        {Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
          <RecommendationCardSkeleton key={`auth-skel-m-${i}`} count={1} />
        ))}
        {Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
          <RecommendationCardSkeleton key={`auth-skel-t-${i}`} count={1} />
        ))}
      </div>
    );
  }

  const handleLoadMore = async () => {
    if (loopPending) return; // disabled while pending
    setLoadingMore(true);
    setError(null);
    setLoopSettled(false);

    try {
      // Fresh deficit (3/3) after settled — over-ask to survive collisions,
      // truncate to 3/3. Track appended items locally so we can seed the
      // shared backfill with the full shown set (state closure is stale
      // once we start appending). Per-item stream.
      const appended: Recommendation[] = [];
      let addedMovies = 0;
      let addedTvs = 0;
      const stream = await getRecommendationsStream({
        data: {
          userPrefs,
          previousRecommendations: buildPreviousWithIds(recommendations),
          requestedMovies: TARGET_PER_CATEGORY + OVERASK_BUFFER,
          requestedTvs: TARGET_PER_CATEGORY + OVERASK_BUFFER,
        },
      });
      for await (const rec of stream) {
        if (rec.category === "movie") {
          if (addedMovies >= TARGET_PER_CATEGORY) continue;
          addedMovies++;
        } else {
          if (addedTvs >= TARGET_PER_CATEGORY) continue;
          addedTvs++;
        }
        appended.push(rec as Recommendation);
        setRecommendations((prev) => [...prev, rec as Recommendation]);
      }
      // Resume the shared backfill to top up any shortfall from this batch.
      await runBackfill([...recommendations, ...appended]);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
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

  if (loopSettled && !loopPending && recommendations.length === 0) {
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
            length: Math.max(0, TARGET_PER_CATEGORY - categoryCount("movie")),
          }).map((_, i) => (
            <RecommendationCardSkeleton key={`loop-skel-m-${i}`} count={1} />
          ))}
        {loopPending &&
          Array.from({
            length: Math.max(0, TARGET_PER_CATEGORY - categoryCount("tv")),
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
