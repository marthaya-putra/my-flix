interface AllPreferencesSkeletonProps {
  /** Width class for the section title placeholder. Defaults to "w-32". */
  titleWidth?: string;
}

export default function AllPreferencesSkeleton({
  titleWidth = "w-32",
}: AllPreferencesSkeletonProps) {
  return (
    <div className="container mx-auto p-4 max-w-6xl animate-pulse">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <div className="h-10 bg-muted rounded-lg w-32"></div>
          <div className="h-10 bg-muted rounded-lg w-48"></div>
        </div>
        <div className="h-4 bg-muted rounded-lg w-96"></div>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="bg-card rounded-lg p-6">
          <div className="h-6 bg-muted rounded-lg w-48 mb-2"></div>
          <div className="h-4 bg-muted rounded-lg w-96 mb-6"></div>

          <div className="flex justify-between items-center mb-4">
            <div className={`h-5 bg-muted rounded-lg ${titleWidth}`}></div>
            <div className="h-8 bg-muted rounded-lg w-16"></div>
          </div>
          <div className="flex flex-wrap gap-3">
            {[...Array(20)].map((_, i) => (
              <div key={i} className="h-24 w-32 bg-muted rounded-lg"></div>
            ))}
          </div>
          <div className="mt-6 flex justify-center">
            <div className="h-8 bg-muted rounded-lg w-64"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
