import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Play, X } from "lucide-react";
import { PlayLink } from "./play-link";
import { FilmInfo } from "@/lib/types";
import { motion, AnimatePresence } from "motion/react";
import { tapSpring, overlayTransition } from "@/lib/motion";

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  imdbRating: number;
  tmdbData: FilmInfo | null;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  likedItems: Set<string>;
  dislikedItems: Set<string>;
  imageErrors: Set<string>;
  onLike: (recommendation: Recommendation) => void;
  onDislike: (recommendation: Recommendation) => void;
  onImageError: (key: string) => void;
  /** Whether this card is currently expanded (touch). */
  expanded?: boolean;
  onToggleExpand?: () => void;
}

export function RecommendationCard({
  recommendation,
  likedItems,
  dislikedItems,
  imageErrors,
  onLike,
  onDislike,
  onImageError,
  expanded = false,
  onToggleExpand,
}: RecommendationCardProps) {
  const imageErrorKey = `${recommendation.title}-${recommendation.releasedYear}`;

  const showOverlay = expanded;

  return (
    <motion.div
      className="group/card hover-lift relative rounded-lg overflow-hidden bg-black cursor-pointer select-none mx-auto w-full max-w-[240px]"
      style={{ aspectRatio: "2 / 3" }}
      whileTap={{ scale: 0.97 }}
      transition={tapSpring}
      onClick={() => {
        if (onToggleExpand && "ontouchstart" in window) {
          onToggleExpand();
        }
      }}
    >
      {/* Poster */}
      {recommendation.tmdbData?.posterPath &&
      !imageErrors.has(imageErrorKey) ? (
        <img
          src={recommendation.tmdbData.posterPath}
          alt={`${recommendation.title} poster`}
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => onImageError(imageErrorKey)}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-card">
          <div className="text-center p-4">
            <div className="text-4xl mb-2">🎬</div>
            <p className="text-sm">No poster available</p>
          </div>
        </div>
      )}

      {/* Rating badge — glass pill, top-left */}
      <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded-full border border-yellow-400/20 backdrop-blur-md bg-black/50 text-yellow-400 text-xs font-bold z-10">
        ⭐ {recommendation.imdbRating.toFixed(1)}
      </span>

      {/* Year + category badges — glass pills, top-right */}
      <div className="absolute top-2.5 right-2.5 flex gap-1.5 z-10">
        <span className="px-2 py-0.5 rounded-full border border-white/15 backdrop-blur-md bg-black/50 text-white text-xs">
          {recommendation.category === "movie" ? "Movie" : "TV"}
        </span>
        <span className="px-2 py-0.5 rounded-full border border-white/15 backdrop-blur-md bg-black/50 text-white text-xs">
          {recommendation.releasedYear}
        </span>
      </div>

      {/* Bottom title strip — always visible at rest */}
      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-black/0 pt-16 pb-3 px-3 z-10">
        <h4 className="font-semibold text-sm md:text-base text-white line-clamp-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
          {recommendation.title}
        </h4>
      </div>

      {/* Hover overlay — CSS group-hover for desktop */}
      <div
        className={`absolute inset-0 z-20 bg-black flex flex-col justify-between pt-2 px-4 pb-4 opacity-0 pointer-events-none group-hover/card:opacity-100 group-hover/card:pointer-events-auto ${
          showOverlay ? "!opacity-0 !pointer-events-none" : ""
        }`}
        style={{ transition: "opacity 200ms ease-out" }}
      >
        <div className="space-y-1.5 shrink-0">
          <h4 className="font-semibold text-base md:text-lg text-white leading-snug">
            {recommendation.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-white/70">
            <span className="px-1.5 py-0.5 bg-yellow-600/90 text-white rounded">
              ⭐ {recommendation.imdbRating.toFixed(1)}
            </span>
            <span>{recommendation.category === "movie" ? "Movie" : "TV"}</span>
            <span>{recommendation.releasedYear}</span>
          </div>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 my-2">
          <p className="text-sm md:text-[15px] text-white/90 leading-relaxed">
            {recommendation.reason}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <PlayLink
            title={recommendation.title}
            category={recommendation.category}
          >
            <Button variant="default" size="sm" className="gap-1.5 text-xs h-8">
              <Play className="h-3.5 w-3.5 fill-current" />
              Watch
            </Button>
          </PlayLink>
          {recommendation.tmdbData && (
            <div className="flex gap-1 ml-auto">
              <motion.div whileTap={{ scale: 0.9 }} transition={tapSpring}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDislike(recommendation);
                  }}
                  className="p-1.5 h-8 w-8"
                >
                  <ThumbsDown
                    className={`h-4 w-4 ${
                      dislikedItems.has(`${recommendation.tmdbData.id}`)
                        ? "fill-red-500 text-red-500"
                        : "text-muted-foreground hover:text-red-500 hover:fill-red-100"
                    }`}
                  />
                </Button>
              </motion.div>
              <motion.div whileTap={{ scale: 0.9 }} transition={tapSpring}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLike(recommendation);
                  }}
                  className="p-1.5 h-8 w-8"
                >
                  <ThumbsUp
                    className={`h-4 w-4 ${
                      likedItems.has(`${recommendation.tmdbData.id}`)
                        ? "fill-white text-white"
                        : "text-muted-foreground hover:text-red-500 hover:fill-red-100"
                    }`}
                  />
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      </div>

      {/* Expanded overlay — touch, animated via AnimatePresence (materialization, skill §12) */}
      <AnimatePresence>
        {showOverlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={overlayTransition}
            className="absolute -inset-px z-20 bg-black flex flex-col justify-between pt-2 px-4 pb-4"
          >
            {expanded && onToggleExpand && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleExpand();
                }}
                className="absolute top-2 right-2 p-1 text-white/70 hover:text-white z-30"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <div className="space-y-1.5 shrink-0">
              <h4 className="font-semibold text-base md:text-lg text-white leading-snug">
                {recommendation.title}
              </h4>
              <div className="flex items-center gap-2 text-xs text-white/70">
                <span className="px-1.5 py-0.5 bg-yellow-600/90 text-white rounded">
                  ⭐ {recommendation.imdbRating.toFixed(1)}
                </span>
                <span>{recommendation.category === "movie" ? "Movie" : "TV"}</span>
                <span>{recommendation.releasedYear}</span>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto pr-1 -mr-1 my-2">
              <p className="text-sm md:text-[15px] text-white/90 leading-relaxed">
                {recommendation.reason}
              </p>
              {!recommendation.tmdbData && (
                <p className="text-[10px] text-amber-400/80 mt-2">
                  ℹ️ TMDB data not available
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <PlayLink
                title={recommendation.title}
                category={recommendation.category}
              >
                <Button variant="default" size="sm" className="gap-1.5 text-xs h-8">
                  <Play className="h-3.5 w-3.5 fill-current" />
                  Watch
                </Button>
              </PlayLink>
              {recommendation.tmdbData && (
                <div className="flex gap-1 ml-auto">
                  <motion.div whileTap={{ scale: 0.9 }} transition={tapSpring}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDislike(recommendation);
                      }}
                      className="p-1.5 h-8 w-8"
                    >
                      <ThumbsDown
                        className={`h-4 w-4 ${
                          dislikedItems.has(`${recommendation.tmdbData.id}`)
                            ? "fill-red-500 text-red-500"
                            : "text-muted-foreground hover:text-red-500 hover:fill-red-100"
                        }`}
                      />
                    </Button>
                  </motion.div>
                  <motion.div whileTap={{ scale: 0.9 }} transition={tapSpring}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onLike(recommendation);
                      }}
                      className="p-1.5 h-8 w-8"
                    >
                      <ThumbsUp
                        className={`h-4 w-4 ${
                          likedItems.has(`${recommendation.tmdbData.id}`)
                            ? "fill-white text-white"
                            : "text-muted-foreground hover:text-red-500 hover:fill-red-100"
                        }`}
                      />
                    </Button>
                  </motion.div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
