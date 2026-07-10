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
import { type StreamEvent } from "@/lib/data/stream-events";

// Spec 0006: manual NDJSON transport. We POST to the raw route and read
// response.body ourselves — the server writes one JSON object + "\n" per
// StreamEvent, and we split on "\n" so chunk boundaries never corrupt a
// frame (the bug that killed the TanStack async-generator RPC).
const STREAM_ROUTE = "/api/recommendations/stream";

// Server owns the deficit loop now (Spec 0004). Client is a dumb consumer
// of the StreamEvent sentinel protocol — it renders skeletons on
// groupStart, appends cards on item, swaps in an error card on
// groupEnd{error}.
const TARGET_PER_CATEGORY = 3;

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  imdbRating: number;
  tmdbData: FilmInfo | null;
}

type CategoryStatus = "pending" | "ok" | "error";

const STATUS_MESSAGES: Record<string, string> = {
  generation_failed: "Couldn't generate recommendations. Try again.",
  exhausted: "Couldn't find fresh recommendations — try again.",
  enrichment_empty: "Recommendations failed to resolve. Try again.",
};

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());

  // Per-category lifecycle state driven by StreamEvent protocol.
  const [categoryStatus, setCategoryStatus] = useState<
    Record<"movie" | "tv", CategoryStatus>
  >({ movie: "pending", tv: "pending" });
  const [categoryError, setCategoryError] = useState<
    Record<"movie" | "tv", string | null>
  >({ movie: null, tv: null });
  const [hasStarted, setHasStarted] = useState(false);

  const { data, isPending: sessionPending } = authClient.useSession();
  const userId = data?.user?.id;

  // Abort the in-flight fetch on unmount or a second Load More. Preserved
  // from the old async-generator path — fetch rejects with AbortError and
  // the catch swallows it.
  const abortRef = useRef<AbortController | null>(null);

  // Build previousRecommendations payload from shown survivors. IDs are
  // needed server-side for the ID filter.
  const buildPreviousWithIds = (recs: Recommendation[]) =>
    recs
      .filter((r) => r.tmdbData)
      .map((r) => ({
        id: r.tmdbData!.id,
        title: r.title,
        year: r.releasedYear,
        category: r.category,
      }));

  // Consume the StreamEvent protocol. ONE call per load — the server runs
  // both category pipelines in parallel and emits groupStart/item/groupEnd
  // sentinels. No client-side deficit math. Transport is manual NDJSON
  // (Spec 0006): fetch + ReadableStream reader + buffer/split on "\n".
  const consumeStream = async (seed: Recommendation[]) => {
    setHasStarted(true);
    setError(null);
    setCategoryStatus({ movie: "pending", tv: "pending" });
    setCategoryError({ movie: null, tv: null });

    const local: Recommendation[] = [...seed];

    // Cancel any prior in-flight stream before starting a new one.
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    // Per-event dispatch. Lifted verbatim from the old for-await body —
    // only the read loop changed.
    const dispatch = (evt: StreamEvent) => {
      if (evt.type === "groupStart") {
        setCategoryStatus((prev) => ({ ...prev, [evt.category]: "pending" }));
      } else if (evt.type === "item") {
        local.push(evt.rec as Recommendation);
        setRecommendations((prev) => [...prev, evt.rec as Recommendation]);
      } else if (evt.type === "groupEnd") {
        const isError =
          evt.status === "generation_failed" ||
          evt.status === "exhausted" ||
          evt.status === "enrichment_empty";
        setCategoryStatus((prev) => ({
          ...prev,
          [evt.category]: isError ? "error" : "ok",
        }));
        if (isError) {
          setCategoryError((prev) => ({
            ...prev,
            [evt.category]:
              evt.error ?? STATUS_MESSAGES[evt.status] ?? "Failed.",
          }));
        }
      }
    };

    try {
      const response = await fetch(STREAM_ROUTE, {
        method: "POST",
        headers: { "content-type": "application/json" },
        // Server loads userPrefs from the DB (authoritative). Client sends
        // only previousRecommendations — transient shown-not-yet-liked
        // state the server can't derive.
        body: JSON.stringify({
          previousRecommendations: buildPreviousWithIds(local),
        }),
        signal: controller.signal,
      });

      if (!response.ok || !response.body) {
        const text = await response.text().catch(() => "");
        throw new Error(
          `Stream request failed (${response.status}) ${text}`.trim()
        );
      }

      // Manual NDJSON read loop. Chunks may contain multiple frames or
      // split a frame mid-line, so we buffer and split on "\n". Each
      // complete line is one StreamEvent; the trailing partial stays in
      // the buffer until the next chunk (or close).
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, nl).trim();
          buffer = buffer.slice(nl + 1);
          if (!line) continue;
          // A malformed line is a transport-level corruption we can't
          // recover from mid-stream — surface and abort, matching the
          // old throw path.
          let evt: StreamEvent;
          try {
            evt = JSON.parse(line) as StreamEvent;
          } catch (parseErr) {
            console.error("Invalid JSON line:", line, parseErr);
            throw new Error("Malformed stream frame.");
          }
          dispatch(evt);
        }
      }
      // Flush any trailing partial frame (no terminal "\n"). A well-formed
      // server always ends with "\n", but being defensive costs nothing.
      const tail = buffer.trim();
      if (tail) {
        try {
          dispatch(JSON.parse(tail) as StreamEvent);
        } catch {
          /* ignore trailing garbage */
        }
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      const errorMessage =
        err instanceof Error ? err.message : "Failed to load recommendations";
      setError(errorMessage);
      console.error("Stream error:", err);
    }
  };

  // Single external trigger: session id. Once we have it, fire the stream.
  // StrictMode in dev double-invokes effects: mount → unmount → mount. The
  // first invocation starts a stream and aborts it on cleanup; the second
  // starts the real one. We don't guard with a ref — abort ensures the
  // first (aborted) stream's fetch rejects and its reader loop exits
  // immediately via AbortError. Both streams hit the server, but only the
  // second's events reach dispatch because the first is aborted before it
  // can process any chunks.
  useEffect(() => {
    if (!userId) return;
    consumeStream([]);
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

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

  // Load More / retry: whole-fn re-call with the full shown set as
  // previousRecommendations. Both pipelines re-run (documented oddity).
  const handleLoadMore = async () => {
    if (loadingMore) return;
    setLoadingMore(true);
    // Surface pending skeletons for any side not yet "ok".
    setCategoryStatus((prev) => ({
      movie: prev.movie === "ok" ? "ok" : "pending",
      tv: prev.tv === "ok" ? "ok" : "pending",
    }));
    await consumeStream(recommendations);
    setLoadingMore(false);
  };

  const handleLikeRecommendation = async (recommendation: Recommendation) => {
    if (!recommendation.tmdbData) {
      alert("Cannot modify recommendation without TMDB data");
      return;
    }

    const itemKey = `${recommendation.tmdbData.id}`;
    const currentlyLiked = likedItems.has(itemKey);
    const currentlyDisliked = dislikedItems.has(itemKey);

    setLikedItems((prev) => {
      const newSet = new Set(prev);
      if (currentlyLiked) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });

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
      setLikedItems((prev) => {
        const newSet = new Set(prev);
        if (currentlyLiked) {
          newSet.add(itemKey);
        } else {
          newSet.delete(itemKey);
        }
        return newSet;
      });
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

    setDislikedItems((prev) => {
      const newSet = new Set(prev);
      if (currentlyDisliked) {
        newSet.delete(itemKey);
      } else {
        newSet.add(itemKey);
      }
      return newSet;
    });

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
      setDislikedItems((prev) => {
        const newSet = new Set(prev);
        if (currentlyDisliked) {
          newSet.add(itemKey);
        } else {
          newSet.delete(itemKey);
        }
        return newSet;
      });
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

  const movieCount = recommendations.filter(
    (r) => r.category === "movie",
  ).length;
  const tvCount = recommendations.filter((r) => r.category === "tv").length;
  const moviePending = categoryStatus.movie === "pending";
  const tvPending = categoryStatus.tv === "pending";
  const allSettled = !moviePending && !tvPending;
  const empty =
    hasStarted && allSettled && recommendations.length === 0 && !error;

  if (error && recommendations.length === 0) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  if (empty) {
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

        {/* Per-category skeletons while that side's pipeline is pending.
            Each load fetches a fresh batch of TARGET_PER_CATEGORY per side,
            so show that many skeletons regardless of how many cards from
            prior loads are already on screen. The old TARGET-count-minus-
            current-count math showed 0 skeletons once a side had already
            rendered a full batch, hiding the loading state on Load More. */}
        {moviePending &&
          Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
            <RecommendationCardSkeleton key={`loop-skel-m-${i}`} count={1} />
          ))}
        {tvPending &&
          Array.from({ length: TARGET_PER_CATEGORY }).map((_, i) => (
            <RecommendationCardSkeleton key={`loop-skel-t-${i}`} count={1} />
          ))}

        {/* Per-category error card on groupEnd{error}: survivor side keeps streaming */}
        {categoryStatus.movie === "error" &&
          movieCount === 0 &&
          categoryError.movie && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-sm">
              <p className="text-sm text-red-700">
                Movies: {categoryError.movie}
              </p>
            </div>
          )}
        {categoryStatus.tv === "error" && tvCount === 0 && categoryError.tv && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-sm">
            <p className="text-sm text-red-700">TV: {categoryError.tv}</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-center">
        <Button
          onClick={handleLoadMore}
          disabled={loadingMore || moviePending || tvPending}
          variant="outline"
          className="w-sm hover:bg-accent"
        >
          {loadingMore || moviePending || tvPending
            ? "Loading more..."
            : "Load More Recommendations"}
        </Button>
      </div>
    </div>
  );
}
