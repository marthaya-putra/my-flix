import { useState } from "react";
import { RecommendationCard } from "@/components/recommendation-card";
import type { StreamStage } from "@/lib/data/stream-events";
import type { FilmInfo } from "@/lib/types";
import { InitialLoadComposition } from "./initial-load-composition";
import { LoadMoreCard } from "./load-more-card";
import { RecommendationCardSkeleton } from "./recommendation-card-skeleton";
import {
  RecommendationCarousel,
  RecommendationCarouselItem,
} from "./recommendation-carousel";

export type CategoryStatus = "pending" | "ok" | "error";
export type Category = "movie" | "tv";

export type Recommendation = {
  title: string;
  category: Category;
  releasedYear: number;
  reason: string;
  imdbRating: number;
  /** Absent while the poster patch is pending; null after a failed lookup. */
  tmdbData?: FilmInfo | null;
};

type CategorySectionProps = {
  label: string;
  items: Recommendation[];
  status: CategoryStatus;
  stage?: StreamStage;
  /** Target card count — skeletons fill up to this while pending. */
  target?: number;
  errorMessage?: string | null;
  loadingMore: boolean;
  imageErrors: Set<string>;
  scrollToFirstNew?: number;
  onLoadMore: () => void;
  onImageError: (key: string) => void;
};

export function CategorySection({
  label,
  items,
  status,
  stage,
  target,
  errorMessage,
  loadingMore,
  imageErrors,
  scrollToFirstNew,
  onLoadMore,
  onImageError,
}: CategorySectionProps) {
  const hasItems = items.length > 0;
  const isPending = status === "pending";
  const isError = status === "error" && !hasItems && errorMessage;

  // Track which card is expanded (touch). At most one at a time.
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  // Skeletons fill the carousel ONLY beside real cards during the initial
  // stream — they keep the slide count stable (up to target) as items
  // arrive from the single LLM round. With 0 real items the centered
  // stage label owns the state, not skeletons.
  const skeletonCount =
    hasItems && isPending && !loadingMore
      ? Math.max(0, (target ?? 3) - items.length)
      : 0;

  // Show the carousel whenever there are real items.
  const showCarousel = hasItems || loadingMore;

  return (
    <div className="space-y-3">
      <h2 className="text-lg md:text-xl font-display font-semibold text-white">
        {label}
      </h2>

      {/* Error card (only when no items in this category) */}
      {isError && (
        <div className="p-4 bg-destructive/10 border border-destructive/30 rounded-lg max-w-sm">
          <p className="text-sm text-destructive">
            {label}: {errorMessage}
          </p>
        </div>
      )}

      {/* 0-items-pending: centered stage label (not skeletons). */}
      {isPending && !hasItems && !isError && (
        <InitialLoadComposition stage={stage} />
      )}

      {/* Carousel */}
      {showCarousel && (
        <div className="relative min-h-[280px]">
          <RecommendationCarousel
            itemCount={items.length + skeletonCount}
            scrollToFirstNew={scrollToFirstNew}
          >
            {items.map((rec, index) => (
              <RecommendationCarouselItem
                key={`${rec.title}-${rec.releasedYear}-${index}`}
              >
                <RecommendationCard
                  recommendation={rec}
                  imageErrors={imageErrors}
                  onImageError={onImageError}
                  expanded={expandedIndex === index}
                  onToggleExpand={() =>
                    setExpandedIndex((prev) => (prev === index ? null : index))
                  }
                />
              </RecommendationCarouselItem>
            ))}

            {/* Skeleton cards fill the gap while pending. */}
            {Array.from({ length: skeletonCount }, (_, i) => (
              <RecommendationCarouselItem key={`skeleton-${i}`}>
                <RecommendationCardSkeleton />
              </RecommendationCarouselItem>
            ))}

            {/* Trailing load-more card — always last when ≥1 real item
                and not mid-initial-stream. */}
            {hasItems && !isPending && (
              <RecommendationCarouselItem>
                <LoadMoreCard
                  loading={loadingMore}
                  stage={stage}
                  error={errorMessage}
                  onClick={onLoadMore}
                />
              </RecommendationCarouselItem>
            )}
          </RecommendationCarousel>
        </div>
      )}
    </div>
  );
}
