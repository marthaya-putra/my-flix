export default function MoviesSkeleton() {
  return (
    <>
      <div className="flex justify-center items-center gap-4 my-4">
        <div className="w-18 h-8 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="w-20 h-8 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="w-18 h-8 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 my-8">
        {Array.from({ length: 20 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[2/3] rounded-lg bg-muted relative overflow-hidden">
              <div className="shimmer absolute inset-0" />
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center gap-4 my-4">
        <div className="w-28 h-9 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="w-16 h-9 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
        <div className="w-28 h-9 rounded-lg bg-muted relative overflow-hidden">
          <div className="shimmer absolute inset-0" />
        </div>
      </div>
    </>
  );
}
