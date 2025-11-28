export default function MoviesSkeleton() {
  return (
    <>
      <div className="flex justify-center items-center space-x-2 my-4">
        <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 my-8">
        {Array.from({ length: 20 }).map((_, index) => (
          <div key={index} className="space-y-2">
            <div className="aspect-[2/3] bg-gray-200 rounded-lg animate-pulse" />
          </div>
        ))}
      </div>

      <div className="flex justify-center items-center space-x-2 my-4">
        <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-32 h-10 bg-gray-200 rounded-lg animate-pulse" />
        <div className="w-20 h-10 bg-gray-200 rounded-lg animate-pulse" />
      </div>
    </>
  );
}
