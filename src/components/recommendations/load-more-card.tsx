import { Plus, RotateCw } from "lucide-react";
import { type StreamStage, STAGE_COPY } from "@/lib/data/stream-events";

interface LoadMoreCardProps {
  /** Whether load-more is currently in-flight for this category. */
  loading: boolean;
  stage?: StreamStage;
  error?: string | null;
  onClick: () => void;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1 h-1 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

export function LoadMoreCard({
  loading,
  stage,
  error,
  onClick,
}: LoadMoreCardProps) {
  // Error state — retry reuses onClick (a retry is just another load-more).
  if (error) {
    return (
      <div
        className="rounded-lg overflow-hidden bg-muted border border-destructive/30 flex flex-col items-center justify-center gap-3 p-4 mx-auto w-full max-w-[240px]"
        style={{ aspectRatio: "2 / 3" }}
      >
        <p className="text-xs text-destructive text-center px-2">{error}</p>
        <button
          onClick={onClick}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RotateCw className="h-3.5 w-3.5" />
          Retry
        </button>
      </div>
    );
  }

  // Loading state — animated shimmer copy, mirrors the stage messaging.
  if (loading) {
    const copy = stage ? STAGE_COPY[stage] : "Finding your next favorites";

    return (
      <div
        className="rounded-lg overflow-hidden bg-muted flex flex-col items-center justify-center gap-2 p-4 mx-auto w-full max-w-[240px]"
        style={{ aspectRatio: "2 / 3" }}
      >
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-medium text-center bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]">
            {copy}
          </span>
          <TypingDots />
        </div>
      </div>
    );
  }

  // Idle CTA state.
  return (
    <button
      onClick={onClick}
      className="rounded-lg overflow-hidden bg-muted/60 border border-dashed border-muted-foreground/25 flex flex-col items-center justify-center gap-2 hover:bg-muted hover:border-muted-foreground/40 transition-colors cursor-pointer w-full mx-auto max-w-[240px]"
      style={{ aspectRatio: "2 / 3" }}
    >
      <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted-foreground/10">
        <Plus className="h-5 w-5 text-muted-foreground" />
      </div>
      <span className="text-xs text-muted-foreground">Load more</span>
    </button>
  );
}
