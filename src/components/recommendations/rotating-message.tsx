import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/** Opacity-only swap — no movement. Used for reduced-motion. */
const FADE_ONLY = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.12, ease: [0.23, 1, 0.32, 1] },
} as const;

/** Vertical roll: old text exits up, new enters from below — like a ticker. */
const ROLL = {
  initial: { opacity: 0, y: "100%" },
  animate: { opacity: 1, y: "0%" },
  exit: { opacity: 0, y: "-100%" },
  transition: { duration: 0.3, ease: [0.23, 1, 0.32, 1] },
} as const;

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
  const prefersReducedMotion = useReducedMotion();

  // Reset to first message when the message set changes (i.e. a stage change).
  useEffect(() => {
    setIdx(0);
  }, [messages]);

  // Advance every 3s, stopping once we reach the last message. Single-message
  // sets skip the timer entirely.
  useEffect(() => {
    if (messages.length <= 1) return;
    if (idx >= messages.length - 1) return;
    const id = setTimeout(() => setIdx(idx + 1), 5000);
    return () => clearTimeout(id);
  }, [messages, idx]);

  // Roll on every text change — both within a stage (idx advances) and across
  // stage transitions (messages ref changes, idx resets to 0). Reduced-motion
  // users get an opacity-only fade.
  const variants = prefersReducedMotion ? FADE_ONLY : ROLL;

  return (
    <span className={cn("relative inline-flex overflow-hidden", className)}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={messages[idx]}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          className="block whitespace-nowrap bg-gradient-to-r from-muted-foreground via-foreground to-muted-foreground bg-[length:200%_100%] bg-clip-text text-transparent animate-[shimmer_2s_linear_infinite]"
        >
          {messages[idx]}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
