import { Play, Star } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { authClient } from "@/lib/auth-client";
import { ctaDramaSpring } from "@/lib/motion";
import { FilmInfo } from "@/lib/types";
import { cn, HIT_ZONE, PILL_BUTTON_CLASS } from "@/lib/utils";
import { DislikeButton, LikeButton, WatchlistButton } from "./buttons";
import { PlayLink } from "./play-link";

type MovieCardProps = FilmInfo & {
  match?: string;
};

export function MovieCard({
  posterPath,
  title,
  voteAverage,
  releaseDate,
  category,
  match,
  id,
  genres,
  backdropPath,
  overview,
  genreIds,
}: MovieCardProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
  // Like + watchlist state is owned by the shared button components
  // (LikeButton / WatchlistButton), which read straight from the QueryClient
  // cache (primed by the route loaders) and call the reaction hooks
  // internally. React Query dedupes identical query keys, so N cards share
  // one request. This removes the route → MoviesContent/ContentRow →
  // MovieCard prop chain (~20 lines of pure forwarding).
  const [imgSrc, setImgSrc] = useState(posterPath);
  const [hasError, setHasError] = useState(!posterPath);

  const filmInfo: FilmInfo = {
    id,
    posterPath,
    backdropPath,
    title,
    overview,
    voteAverage,
    releaseDate,
    category,
    genreIds,
    genres,
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-chart-2 border-chart-2/30";
    if (rating >= 6.5) return "text-chart-1 border-chart-1/30";
    if (rating >= 5) return "text-chart-3 border-chart-3/30";
    return "text-muted-foreground border-muted-foreground/30";
  };

  return (
    <div className="group/card relative aspect-[3/4] w-full rounded-lg overflow-hidden cursor-pointer">
      {/* Rating badge — glass pill, top-right. Hidden when the card has no
          rating (e.g. watchlist rows, which don't store voteAverage). */}
      {voteAverage > 0 && (
        <div className="absolute top-2.5 right-2.5 z-10">
          <div
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full border backdrop-blur-md bg-black/50",
              getRatingColor(voteAverage),
            )}
          >
            <Star className="w-3 h-3 fill-current" />
            <span className="text-xs font-bold">{voteAverage.toFixed(1)}</span>
          </div>
        </div>
      )}

      <img
        src={imgSrc}
        alt={title}
        className="w-full h-full object-cover"
        onError={() => {
          setImgSrc("/poster-placeholder.svg");
          setHasError(true);
        }}
      />

      {/* Title Overlay — shown on error or as rest-state baseline */}
      <div
        className={cn(
          "absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent transition-opacity duration-300 flex flex-col justify-center p-4",
          hasError ? "opacity-100" : "opacity-0",
        )}
      >
        <h3 className="font-display font-bold text-white text-lg text-center">
          {title}
        </h3>
      </div>

      {/* Hover Overlay — opacity/translate driven by group-hover utilities */}
      <motion.div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 flex flex-col justify-end p-4 pointer-events-none group-hover/card:pointer-events-auto transition-opacity duration-200">
        <div className="translate-y-4 group-hover/card:translate-y-0 transition-transform duration-200 ease-out">
          <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">
            {title}
          </h3>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {match && (
              <span className="text-xs font-bold text-chart-2">
                {match} Match
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {new Date(releaseDate).getFullYear()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <PlayLink title={title} category={category}>
                    <motion.div
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.7 }}
                      transition={ctaDramaSpring}
                    >
                      <Button
                        size="icon"
                        aria-label={`Play ${title}`}
                        className={cn(HIT_ZONE, "w-8 h-8", PILL_BUTTON_CLASS)}
                      >
                        <Play className="w-4 h-4 fill-current ml-0.5" />
                      </Button>
                    </motion.div>
                  </PlayLink>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex gap-2">
              {!sessionPending && session && (
                <WatchlistButton filmInfo={filmInfo} />
              )}

              {!sessionPending && session && (
                <DislikeButton filmInfo={filmInfo} />
              )}

              {!sessionPending && session && <LikeButton filmInfo={filmInfo} />}
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 inline-block"></span>
            {category === "movie" ? "Movie" : "TV Series"}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
