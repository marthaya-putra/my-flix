import type { Transition, Variants } from "motion/react";

/**
 * Shared motion presets for cards and interactive controls.
 *
 * Centralized because every card previously re-declared its own spring with
 * `damping: 1` (near-zero = heavily underdamped → long oscillation after a
 * tap/hover). Keep all motion tuned here so it stays consistent and subtle.
 */

// `--ease-out` token from app.css — bounded ease, no overshoot.
const EASE_OUT = [0.23, 1, 0.32, 1] as const;

/**
 * Soft press feedback with a tiny bounce. Used on all `whileTap` gestures
 * (card roots, like / dislike / play buttons). Settles in ~250ms.
 */
export const tapSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 25,
};

/**
 * Bounded tween for overlay / AnimatePresence enter-exit fades. No overshoot,
 * short and quiet.
 */
export const overlayTransition: Transition = {
  duration: 0.22,
  ease: EASE_OUT,
};

/**
 * Fade + rise entrance variants (stagger container children). For mount-time
 * reveals (e.g. NotFound). Bounded tween, no underdamped spring.
 */
export const fadeUpContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const fadeUpItem: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: EASE_OUT,
    },
  },
};
