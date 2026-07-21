import { Play, ThumbsUp, Star, Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { FilmInfo } from "@/lib/types";
import { HIT_ZONE } from "@/lib/utils";
import { PlayLink } from "./play-link";
import { authClient } from "@/lib/auth-client";
import { motion } from "motion/react";
import { ctaDramaSpring } from "@/lib/motion";

interface MovieCardProps extends FilmInfo {
  match?: string;
  isLiked?: boolean;
  onToggleLike?: (filmInfo: FilmInfo) => void;
  isWatchlisted?: boolean;
  onToggleWatchlist?: (filmInfo: FilmInfo) => void;
}

export default function MovieCard({
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
  isLiked = false,
  onToggleLike,
  isWatchlisted = false,
  onToggleWatchlist,
}: MovieCardProps) {
  const { data: session, isPending: sessionPending } = authClient.useSession();
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

  const handleToggleLike = () => {
    if (onToggleLike) {
      onToggleLike(filmInfo);
    }
  };

  const handleToggleWatchlist = () => {
    if (onToggleWatchlist) {
      onToggleWatchlist(filmInfo);
    }
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-emerald-400 border-emerald-400/30";
    if (rating >= 6.5) return "text-blue-400 border-blue-400/30";
    if (rating >= 5) return "text-orange-400 border-orange-400/30";
    return "text-slate-400 border-slate-400/30";
  };

  return (
    <div
      className="group/card relative aspect-[3/4] w-full rounded-lg overflow-hidden cursor-pointer"
    >
      {/* Rating badge — glass pill, top-right */}
      <div className="absolute top-2.5 right-2.5 z-10">
        <div
          className={`flex items-center gap-1 px-2 py-0.5 rounded-full border backdrop-blur-md bg-black/50 ${getRatingColor(voteAverage)}`}
        >
          <Star className="w-3 h-3 fill-current" />
          <span className="text-xs font-bold">{voteAverage.toFixed(1)}</span>
        </div>
      </div>

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
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent ${hasError ? "opacity-100" : "opacity-0"} transition-opacity duration-300 flex flex-col justify-center p-4`}
      >
        <h3 className="font-display font-bold text-white text-lg text-center">
          {title}
        </h3>
      </div>

      {/* Hover Overlay — opacity/translate driven by group-hover utilities */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent opacity-0 group-hover/card:opacity-100 flex flex-col justify-end p-4 pointer-events-none group-hover/card:pointer-events-auto transition-opacity duration-200"
      >
        <div className="translate-y-4 group-hover/card:translate-y-0 transition-transform duration-200 ease-out">
          <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">
            {title}
          </h3>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {match && (
              <span className="text-xs font-bold text-emerald-400">
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
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
                      <Button
                        size="icon"
                        className={`${HIT_ZONE} w-8 h-8 rounded-full bg-white text-black hover:bg-white/90 shadow-lg shadow-white/10`}
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
              {!sessionPending && session && onToggleWatchlist && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleToggleWatchlist}
                        className={`${HIT_ZONE} w-8 h-8 rounded-full backdrop-blur-md border transition-colors ${
                          isWatchlisted
                            ? "bg-violet-500/20 text-violet-500 border-violet-500/30 hover:bg-violet-500/30"
                            : "border-white/20 bg-black/40 text-white hover:bg-white/10"
                        }`}
                      >
                        <Bookmark
                          className={`w-4 h-4 ${isWatchlisted ? "fill-current" : ""}`}
                        />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isWatchlisted ? "Remove from Watchlist" : "Add to Watchlist"}</p>
                  </TooltipContent>
                </Tooltip>
              )}

              {!sessionPending && session && onToggleLike && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.7 }} transition={ctaDramaSpring}>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={handleToggleLike}
                        className={`${HIT_ZONE} w-8 h-8 rounded-full backdrop-blur-md border transition-colors ${
                          isLiked
                            ? "bg-primary/20 text-primary border-primary/30 hover:bg-primary/30"
                            : "border-white/20 bg-black/40 text-white hover:bg-white/10"
                        }`}
                      >
                        <ThumbsUp
                          className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`}
                        />
                      </Button>
                    </motion.div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{isLiked ? "Unlike" : "I like this"}</p>
                  </TooltipContent>
                </Tooltip>
              )}
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
