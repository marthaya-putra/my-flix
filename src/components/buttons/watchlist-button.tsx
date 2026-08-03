import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { FilmInfo } from "@/lib/types";
import { cn, REACTION_BUTTON_BASE } from "@/lib/utils";

type WatchlistButtonProps = {
  filmInfo: FilmInfo;
  disabled?: boolean;
};

/**
 * Shared watchlist CTA. Owns the Button + HIT_ZONE + CSS hover/active scale +
 * the active/inactive glass-pill styling.
 * Reads `useWatchlist()` and calls `toggleWatchlist(filmInfo)` internally.
 *
 * Canonical style is the hover-overlay glass pill: `rounded-full
 * backdrop-blur-md border`, active = --primary (the brand accent), inactive
 * = glass pill. Both RecommendationCard overlays render identically;
 * MovieCard passes its own `disabled` gate.
 */
export function WatchlistButton({ filmInfo, disabled }: WatchlistButtonProps) {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const watchlisted = isWatchlisted(filmInfo.id);

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={disabled}
      aria-pressed={watchlisted}
      aria-label={`Add ${filmInfo.title} to Watchlist`}
      onClick={(e) => {
        e.stopPropagation();
        toggleWatchlist(filmInfo);
      }}
      className={cn(
        REACTION_BUTTON_BASE,
        "hover:scale-110 active:scale-90 transition-transform duration-200 ease-out",
        watchlisted
          ? "border-primary/30 bg-primary/20"
          : "border-white/20 bg-black/40 hover:bg-white/10",
      )}
    >
      <Bookmark
        className={cn(
          "h-4 w-4",
          watchlisted
            ? "fill-primary text-primary"
            : "text-muted-foreground hover:text-primary hover:fill-primary/20",
        )}
      />
    </Button>
  );
}
