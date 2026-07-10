/** 2:3 skeleton card matching the poster card's resting shape. */
export function RecommendationCardSkeleton() {
  return (
    <div
      className="relative rounded-lg overflow-hidden bg-muted mx-auto w-full max-w-[240px]"
      style={{ aspectRatio: "2 / 3" }}
    >
      {/* Poster area shimmer */}
      <div className="absolute inset-0 shimmer" />

      {/* Title strip (bottom) */}
      <div className="absolute bottom-0 inset-x-0 pt-10 pb-3 px-3">
        <div className="h-3.5 w-3/4 rounded bg-foreground/10" />
        <div className="h-3.5 w-1/2 rounded bg-foreground/10 mt-1.5" />
      </div>
    </div>
  );
}
