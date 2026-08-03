import { ThumbsUp } from "lucide-react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { useLikedItems } from "@/hooks/use-liked-items";
import { ctaDramaSpring } from "@/lib/motion";
import type { FilmInfo } from "@/lib/types";
import { cn, REACTION_BUTTON_BASE } from "@/lib/utils";

type LikeButtonProps = {
  filmInfo: FilmInfo;
  disabled?: boolean;
};

/**
 * Shared like CTA. Owns the Button + HIT_ZONE + CSS hover/active scale + the
 * active/inactive glass-pill styling.
 * Reads `useLikedItems()` and calls `toggleLike(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = primary, inactive = glass pill.
 * Like↔dislike mutual exclusion lives in the hooks, so this renders as a
 * fully independent sibling of <DislikeButton> — no coordination props.
 */
export function LikeButton({ filmInfo, disabled }: LikeButtonProps) {
  const { isLiked, toggleLike } = useLikedItems();
  const liked = isLiked(filmInfo.id);

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
        aria-pressed={liked}
        aria-label={`Like ${filmInfo.title}`}
        onClick={(e) => {
          e.stopPropagation();
          toggleLike(filmInfo);
        }}
        className={cn(
          REACTION_BUTTON_BASE,
          liked
            ? "border-primary/30 bg-primary/20"
            : "border-white/20 bg-black/40 hover:bg-white/10",
        )}
      >
        <ThumbsUp
          className={cn(
            "h-4 w-4",
            liked
              ? "fill-primary text-primary"
              : "text-muted-foreground hover:text-primary hover:fill-primary/20",
          )}
        />
      </Button>
    </motion.div>
  );
}
