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
 * More pronounced press feedback for icon CTAs (like / dislike). Bigger scale
 * + softer spring so the press-down reads clearly even on a fast tap.
 */
export const ctaTapSpring: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 18,
};

/**
 * Dramatic press feedback for icon CTAs — big squish (0.7) with a bouncy
 * release that visibly overshoots before settling. Playful, high-energy.
 */
export const ctaDramaSpring: Transition = {
  type: "spring",
  stiffness: 400,
  damping: 12,
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
 * Watchlist grid item enter/exit. Bounded tween (no overshoot) so the card
 * fades + softly scales on remove and on initial mount; siblings FLIP into the
 * closed gap via `layout`. Pairs with `AnimatePresence mode="popLayout"`.
 */
export const watchlistCardVariants: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.9 },
};

/**
 * Watchlist empty-state entrance. Same gentle fade + scale shape as the card,
 * but a slightly longer beat (0.3s) — the empty state is rare and a touch
 * slower reads as deliberate, not sluggish. One-off enter only.
 */
export const watchlistEmptyState = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1 },
  transition: { duration: 0.3, ease: EASE_OUT },
} as const;

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
