import { ThumbsUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLikedItems } from "@/hooks/use-liked-items";
import type { FilmInfo } from "@/lib/types";
import { cn, REACTION_BUTTON_BASE } from "@/lib/utils";

type LikeButtonProps = {
  filmInfo: FilmInfo;
  disabled?: boolean;
};

/**
 * Shared like CTA. Owns the Button + Tooltip + HIT_ZONE + CSS hover/active
 * scale + the active/inactive glass-pill styling and tooltip label.
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
    <Tooltip>
      <TooltipTrigger asChild>
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
            "hover:scale-110 active:scale-90 transition-transform duration-200 ease-out",
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
      </TooltipTrigger>
      <TooltipContent>
        <p>{liked ? "Unlike" : "I like this"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
