import { type StreamStage, STAGE_COPY } from "@/lib/data/stream-events";

interface InitialLoadCompositionProps {
  stage?: StreamStage;
}

function TypingDots() {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </span>
  );
}

/** Centered animated stage label for the 0-items-pending gap. */
export function InitialLoadComposition({ stage }: InitialLoadCompositionProps) {
  const copy = stage ? STAGE_COPY[stage] : "Finding your next favorites";

  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] gap-4 w-full">
      <div className="flex items-center gap-2">
        <span className="text-sm md:text-base font-medium bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]">
          {copy}
        </span>
        <TypingDots />
      </div>
    </div>
  );
}
