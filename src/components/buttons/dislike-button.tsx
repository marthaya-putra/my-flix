import { ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDislikedItems } from "@/hooks/use-disliked-items";
import type { FilmInfo } from "@/lib/types";
import { cn, REACTION_BUTTON_BASE } from "@/lib/utils";

type DislikeButtonProps = {
  filmInfo: FilmInfo;
  disabled?: boolean;
};

/**
 * Shared dislike CTA. Owns the Button + Tooltip + HIT_ZONE + CSS hover/active
 * scale + the active/inactive glass-pill styling and tooltip label.
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
    <Tooltip>
      <TooltipTrigger asChild>
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
            "hover:scale-110 active:scale-90 transition-transform duration-200 ease-out",
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
      </TooltipTrigger>
      <TooltipContent>
        <p>{disliked ? "Remove dislike" : "Not for me"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
