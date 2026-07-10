import { useState, useEffect, useRef, useCallback } from "react";
import {
  addMoviePreference,
  removeUserPreferenceByPreferenceId,
  addUserDislikeFn,
  removeUserDislikeByPreferenceIdFn,
} from "@/lib/data/preferences";
import { authClient } from "@/lib/auth-client";
import { type StreamEvent, type StreamStage } from "@/lib/data/stream-events";
import {
  CategorySection,
  type CategoryStatus,
  type Category,
  type Recommendation,
} from "./recommendations/category-section";
import { InitialLoadComposition } from "./recommendations/initial-load-composition";

// Spec 0006: manual NDJSON transport.
const STREAM_ROUTE = "/api/recommendations/stream";

const STATUS_MESSAGES: Record<string, string> = {
  generation_failed: "Couldn't generate recommendations. Try again.",
  exhausted: "Couldn't find fresh recommendations — try again.",
  enrichment_empty: "Recommendations failed to resolve. Try again.",
};

export function Recommendations() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loadingMore, setLoadingMore] = useState<Record<Category, boolean>>({
    movie: false,
    tv: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Set<string>>(new Set());
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [dislikedItems, setDislikedItems] = useState<Set<string>>(new Set());

  // Per-category lifecycle state driven by StreamEvent protocol.
  const [categoryStatus, setCategoryStatus] = useState<
    Record<Category, CategoryStatus>
  >({ movie: "pending", tv: "pending" });
  const [categoryError, setCategoryError] = useState<
    Record<Category, string | null>
  >({ movie: null, tv: null });

  // Spec 0010: per-category stage — drives the in-content loading copy
  // (LoadMoreCard), NOT the header.
  const [categoryStage, setCategoryStage] = useState<
    Record<Category, StreamStage | undefined>
  >({ movie: undefined, tv: undefined });
  // Per-category target — how many skeletons to render while pending so the
  // carousel layout stays stable through the deficit-retry loop.
  const [categoryTarget, setCategoryTarget] = useState<
    Record<Category, number>
  >({ movie: 3, tv: 3 });

  // Scroll-to-first-new triggers (index to scroll to after load-more append).
  const [scrollToFirstNew, setScrollToFirstNew] = useState<
    Record<Category, number>
  >({ movie: 0, tv: 0 });

  const [hasStarted, setHasStarted] = useState(false);

  const { data, isPending: sessionPending } = authClient.useSession();
  const userId = data?.user?.id;

  const abortRef = useRef<AbortController | null>(null);

  const buildPreviousWithIds = (recs: Recommendation[]) =>
    recs
      .filter((r) => r.tmdbData)
      .map((r) => ({
        id: r.tmdbData!.id,
        title: r.title,
        year: r.releasedYear,
        category: r.category,
      }));

  const consumeStream = useCallback(
    async (
      seed: Recommendation[],
      categories?: Category[],
      isLoadMore = false,
    ): Promise<{ items: Recommendation[]; error: string | null }> => {
      setHasStarted(true);
      setError(null);

      const cats = categories ?? (["movie", "tv"] as Category[]);

      // Reset only the requested categories (but NOT during load-more —
      // status stays `ok` so the header remains settled).
      if (!isLoadMore) {
        const prevStatus = { ...categoryStatus };
        const prevError = { ...categoryError };
        cats.forEach((c) => {
          prevStatus[c] = "pending";
          prevError[c] = null;
        });
        setCategoryStatus(prevStatus);
        setCategoryError(prevError);
      }

      const local: Recommendation[] = [...seed];
      // Track the terminal error per requested category for this run.
      // Returned to the caller so it can react WITHOUT reading stale state
      // (the setState calls in dispatch are not visible to the awaiting caller).
      const runError: Partial<Record<Category, string | null>> = {};

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      const dispatch = (evt: StreamEvent) => {
        if (evt.type === "groupStart") {
          // During load-more, do NOT flip status to pending.
          if (!isLoadMore) {
            setCategoryStatus((prev) => ({ ...prev, [evt.category]: "pending" }));
          }
          setCategoryTarget((prev) => ({ ...prev, [evt.category]: evt.target }));
          setCategoryStage((prev) => ({ ...prev, [evt.category]: undefined }));
        } else if (evt.type === "item") {
          local.push(evt.rec as Recommendation);
          setRecommendations((prev) => [...prev, evt.rec as Recommendation]);
        } else if (evt.type === "progress") {
          setCategoryStage((prev) => ({ ...prev, [evt.category]: evt.stage }));
        } else if (evt.type === "groupEnd") {
          const isError =
            evt.status === "generation_failed" ||
            evt.status === "exhausted" ||
            evt.status === "enrichment_empty";
          // During load-more, do NOT flip status — it stays `ok`.
          // Only set categoryError so the trailing card can show it.
          if (!isLoadMore) {
            setCategoryStatus((prev) => ({
              ...prev,
              [evt.category]: isError ? "error" : "ok",
            }));
          }
          if (isError) {
            const msg =
              evt.error ?? STATUS_MESSAGES[evt.status] ?? "Failed.";
            runError[evt.category] = msg;
            setCategoryError((prev) => ({
              ...prev,
              [evt.category]: msg,
            }));
          }
          // Clear stage on completion.
          setCategoryStage((prev) => ({ ...prev, [evt.category]: undefined }));
        }
      };

      try {
        const response = await fetch(STREAM_ROUTE, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            previousRecommendations: buildPreviousWithIds(local),
            categories: cats,
          }),
          signal: controller.signal,
        });

        if (!response.ok || !response.body) {
          const text = await response.text().catch(() => "");
          throw new Error(
            `Stream request failed (${response.status}) ${text}`.trim()
          );
        }

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
        const tail = buffer.trim();
        if (tail) {
          try {
            dispatch(JSON.parse(tail) as StreamEvent);
          } catch {
            /* ignore trailing garbage */
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError")
          return { items: local, error: null };
        const errorMessage =
          err instanceof Error ? err.message : "Failed to load recommendations";
        setError(errorMessage);
        cats.forEach((c) => {
          if (!(c in runError)) runError[c] = errorMessage;
        });
        console.error("Stream error:", err);
      }
      const firstCat = cats[0];
      const terminalError = firstCat ? runError[firstCat] ?? null : null;
      return { items: local, error: terminalError };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [categoryStatus, categoryError],
  );

  useEffect(() => {
    if (!userId) return;
    // StrictMode in dev double-invokes effects: mount → unmount → mount.
    // Firing consumeStream synchronously here sends a fetch that the
    // unmount cleanup aborts mid-stream — an aborted streaming Response
    // leaves undici with a "disturbed or locked" body and crashes Node.
    // Defer by one tick: the synchronous unmount cancels mount#1's timer
    // before its fetch is ever sent, so only mount#2 fires. The old
    // `inFlight` ref guard avoided the crash but blocked mount#2 too
    // (it stayed true until the abort propagated), causing infinite loading.
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!cancelled) void consumeStream([]);
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  if (sessionPending) {
    return (
      <div className="space-y-8">
        {(["Movies", "TV"] as const).map((label) => (
          <div key={label} className="space-y-3">
            <h2 className="text-lg md:text-xl font-display font-semibold text-white">
              {label}
            </h2>
            <InitialLoadComposition />
          </div>
        ))}
      </div>
    );
  }

  const handleCategoryLoadMore = async (category: Category) => {
    if (loadingMore[category]) return;
    setLoadingMore((prev) => ({ ...prev, [category]: true }));
    setCategoryError((prev) => ({ ...prev, [category]: null }));

    // Snapshot current item count for this category.
    const catRecs = recommendations.filter((r) => r.category === category);
    const previousTailIndex = catRecs.length;

    // consumeStream with isLoadMore=true — status stays ok, only stage/found/target update.
    const { items: next, error: streamError } = await consumeStream(
      catRecs,
      [category],
      true,
    );

    if (streamError) {
      // Leave loadingMore false but categoryError is set by consumeStream,
      // so the trailing card shows the error + retry affordance.
      setLoadingMore((prev) => ({ ...prev, [category]: false }));
      return;
    }

    // If new items arrived, scroll to the first new card.
    const newCount = next.filter((r) => r.category === category).length;
    if (newCount > previousTailIndex) {
      setScrollToFirstNew((prev) => ({
        ...prev,
        [category]: previousTailIndex,
      }));
    }

    setLoadingMore((prev) => ({ ...prev, [category]: false }));
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

  const movieRecs = recommendations.filter((r) => r.category === "movie");
  const tvRecs = recommendations.filter((r) => r.category === "tv");
  const allSettled =
    categoryStatus.movie !== "pending" && categoryStatus.tv !== "pending";
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
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {(
        [
          { category: "movie", label: "Movies", items: movieRecs },
          { category: "tv", label: "TV", items: tvRecs },
        ] as const
      ).map(({ category, label, items }) => (
        <CategorySection
          key={category}
          label={label}
          items={items}
          status={categoryStatus[category]}
          stage={categoryStage[category]}
          target={categoryTarget[category]}
          errorMessage={categoryError[category]}
          loadingMore={loadingMore[category]}
          likedItems={likedItems}
          dislikedItems={dislikedItems}
          imageErrors={imageErrors}
          scrollToFirstNew={scrollToFirstNew[category]}
          onLoadMore={() => handleCategoryLoadMore(category)}
          onLike={handleLikeRecommendation}
          onDislike={handleDislikeRecommendation}
          onImageError={handleImageError}
        />
      ))}
    </div>
  );
}
