import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bookmark } from "lucide-react";
import { motion } from "motion/react";
import { HIT_ZONE } from "@/lib/utils";
import { ctaDramaSpring } from "@/lib/motion";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { FilmInfo } from "@/lib/types";

interface WatchlistButtonProps {
  filmInfo: FilmInfo;
  disabled?: boolean;
}

/**
 * Shared watchlist CTA. Owns the Button + motion.div + Tooltip + HIT_ZONE +
 * ctaDramaSpring + the active/inactive glass-pill styling and tooltip label.
 * Reads `useWatchlist()` and calls `toggleWatchlist(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = violet-500, inactive = glass pill.
 * Both RecommendationCard overlays render identically; MovieCard passes its
 * own `disabled` gate.
 */
export function WatchlistButton({ filmInfo, disabled }: WatchlistButtonProps) {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const watchlisted = isWatchlisted(filmInfo.id);

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
              toggleWatchlist(filmInfo);
            }}
            className={`${HIT_ZONE} p-1.5 h-8 w-8 rounded-full backdrop-blur-md border transition-colors ${
              watchlisted
                ? "border-violet-500/30 bg-violet-500/20"
                : "border-white/20 bg-black/40 hover:bg-white/10"
            }`}
          >
            <Bookmark
              className={`h-4 w-4 ${
                watchlisted
                  ? "fill-violet-500 text-violet-500"
                  : "text-muted-foreground hover:text-violet-500 hover:fill-violet-500/20"
              }`}
            />
          </Button>
        </motion.div>
      </TooltipTrigger>
      <TooltipContent>
        <p>{watchlisted ? "Remove from Watchlist" : "Add to Watchlist"}</p>
      </TooltipContent>
    </Tooltip>
  );
}
