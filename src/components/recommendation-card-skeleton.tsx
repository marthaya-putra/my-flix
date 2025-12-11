import { Card, CardContent } from "@/components/ui/card";

interface RecommendationCardSkeletonProps {
  showLayout?: boolean;
  count?: number;
}

export function RecommendationCardSkeleton({
  showLayout = false,
  count = 6,
}: RecommendationCardSkeletonProps = {}) {
  const skeletonCards = [...Array(count)].map((_, index) => (
    <Card key={index} className="overflow-hidden ">
      <div className="flex flex-col sm:flex-row min-h-[248px]">
        {/* Poster Image Skeleton */}
        <div className="relative w-full sm:w-48 aspect-2/3 sm:aspect-192/288 bg-muted animate-pulse shrink-0">
          {/* Category and Year Badge Skeleton */}
          <div className="absolute top-2 right-2 flex gap-1">
            <div className="w-12 h-5 bg-gray-700 rounded animate-pulse"></div>
            <div className="w-10 h-5 bg-gray-700 rounded animate-pulse"></div>
          </div>

          {/* Rating Badge Skeleton */}
          <div className="absolute top-2 left-2">
            <div className="w-12 h-5 bg-yellow-700 rounded animate-pulse"></div>
          </div>
        </div>

        {/* Content Skeleton */}
        <CardContent className="flex-1 p-4 w-sm">
          <div className="flex justify-between items-start mb-3">
            {/* Title Skeleton */}
            <div className="h-6 w-32 bg-gray-700 rounded animate-pulse"></div>
            <div className="flex gap-2">
              {/* Watch Now Button Skeleton */}
              <div className="w-20 h-8 bg-gray-700 rounded animate-pulse"></div>
              {/* Thumbs Buttons Skeleton */}
              <div className="flex gap-1">
                <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
              </div>
            </div>
          </div>

          {/* Recommendation Reason Skeleton */}
          <div>
            <div className="h-4 w-24 bg-gray-700 rounded animate-pulse mb-2"></div>
            <div className="space-y-1">
              <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
              <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        </CardContent>
      </div>
    </Card>
  ));

  if (showLayout) {
    return (
      <div className="space-y-6">
        <h3 className="font-semibold mb-4">Recommended for You:</h3>
        <div className="flex flex-wrap gap-4 justify-center">
          {skeletonCards}
        </div>
      </div>
    );
  }

  // By default, wrap in flex container to match Recommendations component behavior
  return (
    <div className="flex flex-wrap gap-4 justify-center">{skeletonCards}</div>
  );
}
