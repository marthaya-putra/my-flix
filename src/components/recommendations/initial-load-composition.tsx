import { type StreamStage, stageMessagesFor } from "@/lib/data/stream-events";
import { RecommendationCardSkeleton } from "./recommendation-card-skeleton";
import { RotatingMessage } from "./rotating-message";

interface InitialLoadCompositionProps {
  stage?: StreamStage;
  stageRetry?: boolean;
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

/**
 * Centered animated stage label for the 0-items-pending gap, overlaid on a
 * dimmed + blurred row of card skeletons so the page reads as a populated
 * carousel while it loads. The backdrop slots share the carousel's basis
 * string, so the loader→carousel swap has zero layout shift.
 */
export function InitialLoadComposition({
  stage,
  stageRetry,
}: InitialLoadCompositionProps) {
  const messages = stageMessagesFor(stage, stageRetry);

  return (
    <div className="relative overflow-hidden min-h-[280px] w-full">
      {/* Background: skeleton row in NORMAL FLOW (not absolute), mirroring
          CarouselContent (`overflow-hidden` parent > `flex -ml-4`) +
          CarouselItem (`min-w-0 grow-0 shrink-0 … pl-4`) exactly. Absolute
          positioning here distorted flex-basis resolution and made cards
          render smaller than the real carousel; normal flow guarantees
          pixel-identical geometry and a zero-shift loader→carousel swap. */}
      <div className="flex -ml-4 opacity-70" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <div
            key={i}
            className="min-w-0 grow-0 shrink-0 basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6 pl-4"
          >
            <RecommendationCardSkeleton />
          </div>
        ))}
      </div>

      {/* Radial scrim so the stage message stays legible over the skeletons. */}
      <div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(0,0,0,0.65)_0%,transparent_70%)]"
        aria-hidden="true"
      />

      {/* Foreground: centered stage message, overlaid on the row. */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="flex items-center gap-2">
          <RotatingMessage
            messages={messages}
            className="text-sm md:text-base font-medium"
          />
          <TypingDots />
        </div>
      </div>
    </div>
  );
}
