import {
  type StreamStage,
  STAGE_MESSAGES,
  STAGE_FALLBACK_MESSAGES,
} from "@/lib/data/stream-events";
import { RotatingMessage } from "./rotating-message";

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
  const messages = stage ? STAGE_MESSAGES[stage] : STAGE_FALLBACK_MESSAGES;

  return (
    <div className="flex flex-col items-center justify-center min-h-[280px] gap-4 w-full">
      <div className="flex items-center gap-2">
        <RotatingMessage
          messages={messages}
          className="text-sm md:text-base font-medium"
        />
        <TypingDots />
      </div>
    </div>
  );
}
