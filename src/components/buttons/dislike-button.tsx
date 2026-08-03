import { ThumbsDown } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useDislikedItems } from "@/hooks/use-disliked-items";
import { ctaDramaSpring } from "@/lib/motion";
import type { FilmInfo } from "@/lib/types";
import { cn, REACTION_BUTTON_BASE } from "@/lib/utils";

type DislikeButtonProps = {
  filmInfo: FilmInfo;
  disabled?: boolean;
};

/**
 * Shared dislike CTA. Owns the Button + HIT_ZONE + CSS hover/active scale +
 * the active/inactive glass-pill styling.
 * Reads `useDislikedItems()` and calls `toggleDislike(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = --destructive (one red system), inactive
 * = glass pill. Like↔dislike mutual exclusion lives in the hooks, so this
 * renders as a fully independent sibling of <LikeButton> — no coordination
 * props.
 */
export function DislikeButton({ filmInfo, disabled }: DislikeButtonProps) {
  const { isDisliked, toggleDislike } = useDislikedItems();
  const disliked = isDisliked(filmInfo.id);

  return (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.7 }}
      transition={ctaDramaSpring}
    >
      <Button
        variant="ghost"
        size="sm"
        disabled={disabled}
        aria-pressed={disliked}
        aria-label={`Dislike ${filmInfo.title}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleDislike(filmInfo);
        }}
        className={cn(
          REACTION_BUTTON_BASE,
          disliked
            ? "border-destructive/30 bg-destructive/20"
            : "border-white/20 bg-black/40 hover:bg-white/10",
        )}
      >
        <ThumbsDown
          className={cn(
            "h-4 w-4",
            disliked
              ? "fill-destructive text-destructive"
              : "text-muted-foreground hover:text-destructive hover:fill-destructive/20",
          )}
        />
      </Button>
    </motion.div>
  );
}
