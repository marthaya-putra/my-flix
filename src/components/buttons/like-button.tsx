import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThumbsUp } from "lucide-react";
import { motion } from "motion/react";
import { HIT_ZONE } from "@/lib/utils";
import { ctaDramaSpring } from "@/lib/motion";
import { useLikedItems } from "@/hooks/use-liked-items";
import type { FilmInfo } from "@/lib/types";

interface LikeButtonProps {
  filmInfo: FilmInfo;
  disabled?: boolean;
}

/**
 * Shared like CTA. Owns the Button + motion.div + Tooltip + HIT_ZONE +
 * ctaDramaSpring + the active/inactive glass-pill styling and tooltip label.
 * Reads `useLikedItems()` and calls `toggleLike(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = primary, inactive = glass pill.
 * Like↔dislike mutual exclusion lives in the hooks (see ADR
 * docs/adr/0002-reaction-mutual-exclusion-in-hooks.md), so this renders as a
 * fully independent sibling of <DislikeButton> — no coordination props.
 */
export function LikeButton({ filmInfo, disabled }: LikeButtonProps) {
  const { isLiked, toggleLike } = useLikedItems();
  const liked = isLiked(filmInfo.id);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.7 }}
          transition={ctaDramaSpring}
        >
          <Button
            variant="ghost"
            size="sm"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation();
              toggleLike(filmInfo);
            }}
            className={`${HIT_ZONE} p-1.5 h-8 w-8 rounded-full backdrop-blur-md border transition-colors ${
              liked
                ? "border-primary/30 bg-primary/20"
                : "border-white/20 bg-black/40 hover:bg-white/10"
            }`}
          >
            <ThumbsUp
              className={`h-4 w-4 ${
                liked
                  ? "fill-primary text-primary"
                  : "text-muted-foreground hover:text-primary hover:fill-primary/20"
              }`}
            />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{liked ? "Unlike" : "I like this"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
