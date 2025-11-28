import { Play, Plus, ThumbsUp, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { FilmInfo } from "@/lib/types";

interface MovieCardProps extends FilmInfo {
  match?: string;
}

export default function MovieCard({
  posterPath,
  title,
  voteAverage,
  releaseDate,
  category,
  match,
}: MovieCardProps) {
  const [imgSrc, setImgSrc] = useState(posterPath);

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-emerald-300 border-emerald-300";
    if (rating >= 6.5) return "text-blue-300 border-blue-300";
    if (rating >= 5) return "text-orange-300 border-orange-300";
    return "text-slate-300 border-slate-300";
  };

  return (
    <div className="group/card relative aspect-[2/3] rounded-md overflow-hidden cursor-pointer transition-all duration-300 hover:z-10 hover:scale-105 hover:shadow-xl shadow-black/50 bg-card">
      {/* Persistent Rating Overlay - Top Right */}
      <div className="absolute top-2 right-2 z-10">
        <div className={`flex items-center gap-2 px-3 py-2 rounded-full border backdrop-blur-sm ${getRatingColor(voteAverage)} bg-black/60`}>
          <Star className="w-4 h-4 fill-current" />
          <span className="text-sm font-bold">
            {voteAverage.toFixed(1)}
          </span>
        </div>
      </div>

      <img
        src={imgSrc}
        alt={title}
        className="w-full h-full object-cover transition-transform duration-500 group-hover/card:brightness-75"
        onError={() =>
          setImgSrc(
            "https://images.unsplash.com/photo-1598899134739-24c46f58b8c0?auto=format&fit=crop&w=800&q=80"
          )
        }
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
        <div className="translate-y-4 group-hover/card:translate-y-0 transition-transform duration-300">
          <h3 className="font-display font-bold text-white text-lg leading-tight mb-2">
            {title}
          </h3>

          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {match && (
              <span className="text-xs font-bold text-green-400">
                {match} Match
              </span>
            )}
            <span className="text-xs text-gray-300">
              {new Date(releaseDate).getFullYear()}
            </span>
          </div>

          <div className="flex items-center justify-between gap-2">
            <div className="flex gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    asChild
                    className="w-8 h-8 rounded-full bg-white text-black hover:bg-gray-200 hover:text-black"
                  >
                    <a
                      href={`https://123movies-official.hair/search?q=${title.replace(
                        / /g,
                        "+"
                      )}&category=${category}`}
                      target="blank"
                      className="relative block text-decoration-none color-inherit"
                    >
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </a>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Play</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="outline"
                    className="w-8 h-8 rounded-full border-gray-400 bg-transparent text-white hover:bg-white/20 hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Add to My List</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="outline"
                  className="w-8 h-8 rounded-full border-gray-400 bg-transparent text-white hover:bg-white/20 hover:text-white"
                >
                  <ThumbsUp className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>I like this</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <div className="mt-3 flex items-center gap-1 text-xs text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-500 inline-block"></span>
            {category === "movie" ? "Movie" : "TV Series"}
          </div>
        </div>
      </div>
    </div>
  );
}
