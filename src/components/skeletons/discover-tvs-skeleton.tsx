export default function DiscoverTvsSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-40 mb-2"></div>
        <div className="h-4 bg-muted rounded-lg w-80"></div>
      </div>

      {/* FilterPopovers bar */}
      <div className="bg-card rounded-lg border border-border shadow-lg mb-8">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 bg-muted rounded"></div>
            <div className="h-6 bg-muted rounded-lg w-20"></div>
          </div>
          <div className="h-5 bg-muted rounded-md w-20"></div>
        </div>
        <div className="p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="h-10 bg-muted rounded-lg w-28"></div>
              <div className="h-10 bg-muted rounded-lg w-24"></div>
              <div className="h-10 bg-muted rounded-lg w-20"></div>
            </div>
            <div className="h-10 bg-muted rounded-lg w-28"></div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 my-8">
        <div className="h-10 bg-muted rounded-lg w-24"></div>
        <div className="h-10 bg-muted rounded-lg w-24"></div>
      </div>

      {/* MoviesContent grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-8">
        {Array.from({ length: 20 }).map((_, i) => (
          <div key={i} className="bg-card rounded-lg overflow-hidden shadow-lg">
            <div className="aspect-[2/3] bg-muted"></div>
            <div className="p-4 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-3 bg-muted rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex justify-center gap-4 my-8">
        <div className="h-10 bg-muted rounded-lg w-24"></div>
        <div className="h-10 bg-muted rounded-lg w-24"></div>
      </div>
    </div>
  );
}
