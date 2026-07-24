/**
 * Loading frame for the /preferences layout route. Mirrors the real shell
 * (header + segmented sub-nav) so the chrome is stable during prefetch, then
 * shows shimmering favorites grids where the content streams in.
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

      {/* Favorites sections */}
      <div className="pt-8 space-y-8">
        {["w-24", "w-28"].map((titleW, sectionIdx) => (
          <div key={sectionIdx}>
            <div className="flex items-center justify-between mb-4">
              <div className={`h-5 rounded shimmer ${titleW}`} />
              <div className="h-8 w-16 rounded-lg shimmer" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-28 rounded-xl shimmer" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
