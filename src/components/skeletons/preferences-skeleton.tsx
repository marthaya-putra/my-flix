/**
 * Loading frame for the /preferences layout route. Mirrors the real shell
 * (header + segmented sub-nav) so the chrome is stable during prefetch, then
 * shows a shimmering dashboard + favorites grid where the content streams in.
 */
export default function PreferencesSkeleton() {
  return (
    <div className="container mx-auto px-4 max-w-6xl">
      {/* Header */}
      <div className="pt-8 pb-6 flex items-end justify-between">
        <div>
          <div className="h-9 w-40 rounded-md shimmer" />
          <div className="h-4 w-64 rounded-md shimmer mt-2" />
        </div>
        <div className="h-9 w-20 rounded-lg shimmer" />
      </div>

      {/* Segmented sub-nav */}
      <div className="glass rounded-xl p-1 flex gap-1">
        {[64, 72, 64, 72].map((w, i) => (
          <div
            key={i}
            className="h-9 rounded-lg shimmer"
            style={{ width: w, flex: 1 }}
          />
        ))}
      </div>

      {/* Dashboard: profile strength + stats */}
      <div className="pt-8 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 glass rounded-xl h-36 p-6">
          <div className="h-4 w-28 rounded shimmer" />
          <div className="h-10 w-20 rounded shimmer mt-3" />
          <div className="h-1.5 w-full rounded-full shimmer mt-4" />
        </div>
        <div className="lg:col-span-3 glass rounded-xl p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-lg shimmer" />
            ))}
          </div>
        </div>
      </div>

      {/* Favorites card */}
      <div className="glass rounded-xl mt-8 p-6">
        <div className="h-5 w-32 rounded shimmer mb-6" />
        <div className="flex gap-1 mb-8">
          {[40, 56, 48, 56].map((w, i) => (
            <div
              key={i}
              className="h-9 rounded-lg shimmer"
              style={{ width: w }}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-28 rounded-xl shimmer" />
          ))}
        </div>
      </div>
    </div>
  );
}
