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
    <div className="px-4 md:px-12 group">
      {/* Header Skeleton */}
      <div className="flex items-end gap-2 group/title cursor-pointer justify-between pb-4 px-4">
        <div className="relative h-7 md:h-8 w-48 bg-muted rounded overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          {Array.from({ length: itemCount }).map((_, index) => (
            <div
              key={index}
              className="flex-shrink-0 w-[210px] px-4 first:pl-4"
            >
              {/* Movie Card Skeleton */}
              <div className="relative aspect-[2/3] rounded-md bg-muted overflow-hidden">
                {/* Main poster area with shimmer */}
                <div className="relative w-full h-full bg-linear-to-br from-muted/50 to-muted">
                  <div className="shimmer absolute inset-0" />
                </div>

                {/* Hover overlay skeleton structure */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <div className="absolute bottom-0 left-0 right-0 p-4">
                    {/* Title skeleton */}
                    <div className="relative h-6 bg-white/20 rounded mb-2 overflow-hidden">
                      <div className="shimmer absolute inset-0" />
                    </div>

                    {/* Metadata skeletons */}
                    <div className="flex items-center gap-2 mb-3">
                      <div className="relative h-5 w-8 bg-green-500/30 rounded overflow-hidden">
                        <div className="shimmer absolute inset-0" />
                      </div>
                      <div className="relative h-5 w-12 bg-white/20 rounded overflow-hidden">
                        <div className="shimmer absolute inset-0" />
                      </div>
                      <div className="relative h-5 w-16 bg-white/20 rounded overflow-hidden">
                        <div className="shimmer absolute inset-0" />
                      </div>
                    </div>

                    {/* Button skeletons */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex gap-2">
                        <div className="relative w-8 h-8 rounded-full bg-white/30 overflow-hidden">
                          <div className="shimmer absolute inset-0" />
                        </div>
                        <div className="relative w-8 h-8 rounded-full bg-white/20 border border-white/20 overflow-hidden">
                          <div className="shimmer absolute inset-0" />
                        </div>
                      </div>
                      <div className="relative w-8 h-8 rounded-full bg-white/20 border border-white/20 overflow-hidden">
                        <div className="shimmer absolute inset-0" />
                      </div>
                    </div>

                    {/* Category indicator */}
                    <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block" />
                      <div className="relative w-12 h-3 bg-gray-500/30 rounded overflow-hidden">
                        <div className="shimmer absolute inset-0" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
