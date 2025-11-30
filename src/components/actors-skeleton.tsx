export default function ActorsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-8">
      {Array.from({ length: 12 }).map((_, index) => (
        <div key={index} className="aspect-3/4 rounded-md bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      ))}
    </div>
  );
}