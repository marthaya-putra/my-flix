import { Card, CardContent } from "@/components/ui/card";

export function RecommendationCardSkeleton() {
  return (
    <div className="space-y-6">
      <h3 className="font-semibold mb-4">Recommended for You:</h3>
      <div className="grid gap-6 grid-cols-1">
        {[...Array(5)].map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <div className="flex flex-col sm:flex-row">
              {/* Poster Image Skeleton */}
              <div className="relative w-full sm:w-48 aspect-2/3 sm:aspect-auto bg-muted animate-pulse">
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
              <CardContent className="flex-1 p-4">
                <div className="flex justify-between items-start mb-3">
                  {/* Title Skeleton */}
                  <div className="h-6 w-48 bg-gray-700 rounded animate-pulse"></div>
                  <div className="flex gap-2">
                    {/* Watch Now Button Skeleton */}
                    <div className="w-24 h-8 bg-gray-700 rounded animate-pulse"></div>
                    {/* Thumbs Buttons Skeleton */}
                    <div className="flex gap-1">
                      <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                      <div className="w-8 h-8 bg-gray-700 rounded animate-pulse"></div>
                    </div>
                  </div>
                </div>

                {/* Recommendation Reason Skeleton */}
                <div className="mb-4">
                  <div className="h-4 w-32 bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="space-y-2">
                    <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-3/4"></div>
                  </div>
                </div>

                {/* Overview Skeleton */}
                <div>
                  <div className="h-3 w-16 bg-gray-700 rounded animate-pulse mb-2"></div>
                  <div className="space-y-1">
                    <div className="h-3 bg-gray-700 rounded animate-pulse"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-5/6"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-4/6"></div>
                    <div className="h-3 bg-gray-700 rounded animate-pulse w-3/6"></div>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}