import { ChevronRight } from "lucide-react";

interface ContentRowSkeletonProps {
  title?: string;
  itemCount?: number;
  showExploreAll?: boolean;
}

export default function ContentRowSkeleton({
  itemCount = 6,
}: ContentRowSkeletonProps) {
  return (
    <div className="px-4 md:px-8 group max-w-7xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex items-end gap-2 group/title cursor-pointer justify-between pb-2">
        <div className="relative h-7 md:h-8 w-48 bg-muted rounded overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      </div>

      <div className="relative">
        <div className="flex -ml-4 overflow-x-auto scrollbar-hide">
          {Array.from({ length: itemCount }).map((_, index) => (
            <div
              key={index}
              className="shrink-0 w-1/2 sm:w-1/3 md:w-1/4 lg:w-1/5 xl:w-1/6 pl-4"
            >
              {/* Movie Card Skeleton */}
              <div className="relative aspect-3/4 rounded-md bg-muted overflow-hidden">
                {/* Main poster area with shimmer */}
                <div className="relative w-full h-full bg-linear-to-br from-muted/50 to-muted">
                  <div className="shimmer absolute inset-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
