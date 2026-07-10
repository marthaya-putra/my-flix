import { Button } from "@/components/ui/button";
import { RecommendationCard } from "@/components/recommendation-card";
import { LiveProgressHeader } from "./live-progress-header";
import {
  RecommendationCarousel,
  RecommendationCarouselItem,
} from "./recommendation-carousel";
import type { StreamStage } from "@/lib/data/stream-events";
import type { FilmInfo } from "@/lib/types";

export type CategoryStatus = "pending" | "ok" | "error";
export type Category = "movie" | "tv";

export interface Recommendation {
  title: string;
  category: Category;
  releasedYear: number;
  reason: string;
  imdbRating: number;
  tmdbData: FilmInfo | null;
}

interface CategorySectionProps {
  label: string;
  items: Recommendation[];
  status: CategoryStatus;
  stage?: StreamStage;
  found?: number;
  target?: number;
  errorMessage?: string | null;
  loadingMore: boolean;
  likedItems: Set<string>;
  dislikedItems: Set<string>;
  imageErrors: Set<string>;
  scrollToLatest?: number;
  onLoadMore: () => void;
  onLike: (rec: Recommendation) => void;
  onDislike: (rec: Recommendation) => void;
  onImageError: (key: string) => void;
}

export function CategorySection({
  label,
  items,
  status,
  stage,
  found,
  target,
  errorMessage,
  loadingMore,
  likedItems,
  dislikedItems,
  imageErrors,
  scrollToLatest,
  onLoadMore,
  onLike,
  onDislike,
  onImageError,
}: CategorySectionProps) {
  const hasItems = items.length > 0;
  const isPending = status === "pending";
  const isError = status === "error" && !hasItems && errorMessage;

  return (
    <div className="space-y-3">
      <LiveProgressHeader
        label={label}
        status={status}
        stage={stage}
        found={found}
        target={target}
        count={items.length}
      />

      {/* Error card (only when no items in this category) */}
      {isError && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg max-w-sm">
          <p className="text-sm text-red-700">
            {label}: {errorMessage}
          </p>
        </div>
      )}

      {/* Carousel — renders even with 0 items so the container has fixed height */}
      <div className="relative min-h-[280px]">
        <RecommendationCarousel
          itemCount={items.length}
          scrollToLatest={scrollToLatest}
        >
          {items.map((rec, index) => (
            <RecommendationCarouselItem key={`${rec.title}-${rec.releasedYear}-${index}`}>
              <RecommendationCard
                recommendation={rec}
                likedItems={likedItems}
                dislikedItems={dislikedItems}
                imageErrors={imageErrors}
                onLike={onLike}
                onDislike={onDislike}
                onImageError={onImageError}
              />
            </RecommendationCarouselItem>
          ))}
        </RecommendationCarousel>
      </div>

      {/* Per-category Load More */}
      <div className="flex">
        <Button
          onClick={onLoadMore}
          disabled={loadingMore || isPending}
          variant="outline"
          size="sm"
          className="hover:bg-accent"
        >
          {loadingMore || isPending
            ? "Loading..."
            : `Load more ${label}`}
        </Button>
      </div>
    </div>
  );
}
