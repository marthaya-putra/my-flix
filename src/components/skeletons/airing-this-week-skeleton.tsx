export default function AiringThisWeekSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      {/* Page header */}
      <div className="mb-8">
        <div className="h-10 bg-muted rounded-lg w-72 mb-2"></div>
        <div className="h-4 bg-muted rounded-lg w-96"></div>
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
