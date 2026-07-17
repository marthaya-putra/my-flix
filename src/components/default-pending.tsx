// Global fallback used when a route is pending (lazy load, loader, etc.).
// Kept intentionally simple — routes with richer loading states override
// via their own `pendingComponent`.
export function DefaultPendingComponent() {
  return (
    <div
      className="min-h-[50vh] flex items-center justify-center"
      role="status"
      aria-label="Loading"
    >
      <div className="w-10 h-10 rounded-full border-2 border-muted border-t-primary animate-spin" />
    </div>
  );
}
