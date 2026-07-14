import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface RotatingMessageProps {
  /** Message set to cycle through. Single-element arrays render statically. */
  messages: string[];
  /** Optional typography / sizing classes for the text. */
  className?: string;
}

/**
 * Dumb rotating text. Cycles `messages` every 2s, holding on the last one.
 * Not aware of stages, copy maps, or progress events — pass it strings and it
 * rotates them. Caller must pass an identity-stable `messages` ref so stage
 * changes reliably reset the index (module constants satisfy this).
 */
export function RotatingMessage({ messages, className }: RotatingMessageProps) {
  const [idx, setIdx] = useState(0);

  // Reset to first message when the message set changes (i.e. a stage change).
  useEffect(() => {
    setIdx(0);
  }, [messages]);

  // Advance every 2s, stopping once we reach the last message. Single-message
  // sets skip the timer entirely.
  useEffect(() => {
    if (messages.length <= 1) return;
    if (idx >= messages.length - 1) return;
    const id = setTimeout(() => setIdx(idx + 1), 3000);
    return () => clearTimeout(id);
  }, [messages, idx]);

  return (
    <span
      className={cn(
        "bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]",
        className,
      )}
    >
      {messages[idx]}
    </span>
  );
}
