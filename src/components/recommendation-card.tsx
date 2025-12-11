import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, Play } from "lucide-react";
import { PlayLink } from "@/components/play-link";
import { FilmInfo } from "@/lib/types";

interface Recommendation {
  title: string;
  category: "movie" | "tv";
  releasedYear: number;
  reason: string;
  tmdbData: FilmInfo | null;
}

interface RecommendationCardProps {
  recommendation: Recommendation;
  likedItems: Set<string>;
  dislikedItems: Set<string>;
  addingToPreferences: Set<string>;
  imageErrors: Set<string>;
  onLike: (recommendation: Recommendation) => void;
  onDislike: (recommendation: Recommendation) => void;
  onImageError: (key: string) => void;
}

export function RecommendationCard({
  recommendation,
  likedItems,
  dislikedItems,
  addingToPreferences,
  imageErrors,
  onLike,
  onDislike,
  onImageError,
}: RecommendationCardProps) {
  const imageErrorKey = `${recommendation.title}-${recommendation.releasedYear}`;

  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <div className="flex flex-col sm:flex-row">
        {/* Poster Image */}
        <div className="relative w-full sm:w-48 aspect-2/3 sm:aspect-auto bg-muted">
          {recommendation.tmdbData?.posterPath &&
          !imageErrors.has(imageErrorKey) ? (
            <img
              src={recommendation.tmdbData.posterPath}
              alt={`${recommendation.title} poster`}
              className="w-full h-full object-cover"
              onError={() => onImageError(imageErrorKey)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center p-4">
                <div className="text-4xl mb-2">🎬</div>
                <p className="text-sm">No poster available</p>
              </div>
            </div>
          )}

          {/* Category and Year Badge */}
          <div className="absolute top-2 right-2 flex gap-1">
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
              {recommendation.category === "movie" ? "Movie" : "TV"}
            </span>
            <span className="px-2 py-1 bg-black/70 text-white text-xs rounded">
              {recommendation.releasedYear}
            </span>
          </div>

          {/* Rating Badge */}
          {recommendation.tmdbData?.voteAverage && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-yellow-600/90 text-white text-xs rounded flex items-center gap-1">
                ⭐ {recommendation.tmdbData.voteAverage.toFixed(1)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-4 max-w-sm">
          <div className="flex justify-between items-start mb-3">
            <h4 className="font-semibold text-xl">{recommendation.title}</h4>
            <div className="flex gap-2">
              <PlayLink
                title={recommendation.title}
                category={recommendation.category}
              >
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 group hover:scale-105 transition-all duration-300"
                >
                  <div
                    className="group-hover:animate-sliding"
                    style={
                      {
                        "--slide-animation-from": "-6px",
                      } as React.CSSProperties
                    }
                  >
                    <Play className="h-4 w-4 fill-current" />
                  </div>
                  Watch Now
                </Button>
              </PlayLink>
              {recommendation.tmdbData && (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDislike(recommendation)}
                    className="p-2 h-8 w-8"
                    disabled={addingToPreferences.has(
                      `${recommendation.tmdbData.id}`
                    )}
                  >
                    <ThumbsDown
                      className={`h-4 w-4 ${
                        dislikedItems.has(`${recommendation.tmdbData.id}`)
                          ? "fill-red-500 text-red-500"
                          : "text-gray-300 hover:text-red-500 hover:fill-red-100"
                      }`}
                    />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onLike(recommendation)}
                    className="p-2 h-8 w-8"
                    disabled={addingToPreferences.has(
                      `${recommendation.tmdbData.id}`
                    )}
                  >
                    <ThumbsUp
                      className={`h-4 w-4 ${
                        likedItems.has(`${recommendation.tmdbData.id}`)
                          ? "fill-white text-white"
                          : "text-gray-300 hover:text-red-500 hover:fill-red-100"
                      }`}
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Recommendation Reason */}
          <div className="mb-4">
            <p className="text-sm text-blue-600 font-medium mb-2">
              Why you'll like it:
            </p>
            <p className="text-muted-foreground text-sm leading-relaxed">
              {recommendation.reason}
            </p>
          </div>

          {!recommendation.tmdbData && (
            <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded">
              ℹ️ TMDB data not available for this recommendation
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
}
