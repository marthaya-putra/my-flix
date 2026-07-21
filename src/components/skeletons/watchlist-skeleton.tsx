export default function WatchlistSkeleton() {
  return (
    <div className="container mx-auto p-4 max-w-6xl animate-pulse">
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-64 mb-2"></div>
        <div className="h-4 bg-muted rounded-lg w-96"></div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className="aspect-[3/4] w-full rounded-lg bg-muted"
          ></div>
        ))}
      </div>
    </div>
  );
}
