import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ThumbsDown } from "lucide-react";
import { motion } from "motion/react";
import { HIT_ZONE } from "@/lib/utils";
import { ctaDramaSpring } from "@/lib/motion";
import { useDislikedItems } from "@/hooks/use-disliked-items";
import type { FilmInfo } from "@/lib/types";

interface DislikeButtonProps {
  filmInfo: FilmInfo;
  disabled?: boolean;
}

/**
 * Shared dislike CTA. Owns the Button + motion.div + Tooltip + HIT_ZONE +
 * ctaDramaSpring + the active/inactive glass-pill styling and tooltip label.
 * Reads `useDislikedItems()` and calls `toggleDislike(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = red-500, inactive = glass pill.
 * Like↔dislike mutual exclusion lives in the hooks (see ADR
 * docs/adr/0002-reaction-mutual-exclusion-in-hooks.md), so this renders as a
 * fully independent sibling of <LikeButton> — no coordination props.
 */
export function DislikeButton({ filmInfo, disabled }: DislikeButtonProps) {
  const { isDisliked, toggleDislike } = useDislikedItems();
  const disliked = isDisliked(filmInfo.id);

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
              toggleDislike(filmInfo);
            }}
            className={`${HIT_ZONE} p-1.5 h-8 w-8 rounded-full backdrop-blur-md border transition-colors ${
              disliked
                ? "border-red-500/30 bg-red-500/20"
                : "border-white/20 bg-black/40 hover:bg-white/10"
            }`}
          >
            <ThumbsDown
              className={`h-4 w-4 ${
                disliked
                  ? "fill-red-500 text-red-500"
                  : "text-muted-foreground hover:text-red-500 hover:fill-red-100"
              }`}
            />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{disliked ? "Remove dislike" : "Not for me"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
