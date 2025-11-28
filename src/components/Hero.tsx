import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilmInfo } from "@/lib/types";
import { getReleasedYear } from "@/lib/utils";

export default function Hero(filmInfo: FilmInfo) {
  return (
    <div className="relative w-full h-[50vh] overflow-hidden">
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center transform animate-in fade-in duration-1000"
        style={{ backgroundImage: `url(${filmInfo.backdropPath})` }}
      >
        <div className="absolute inset-0 bg-linear-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-linear-to-t from-background via-transparent to-transparent" />
      </div>

      <div className="relative h-full flex px-4 md:px-12 max-w-7xl mx-auto">
        <div className="max-w-2xl flex flex-col justify-center">
          <div className="flex items-start gap-3">
            <h1 className="text-5xl md:text-7xl font-display font-black text-white leading-none tracking-tight drop-shadow-2xl uppercase">
              {filmInfo.title}
            </h1>
            <div className="flex items-center gap-1 text-yellow-400">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-white text-xl font-semibold">
                {filmInfo.voteAverage.toFixed(1)}
              </span>
            </div>
          </div>

          <div className="pt-6">
            <Button
              size="lg"
              className="group bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-10 py-4 text-lg uppercase tracking-wide shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
            >
              <div
                className="group-hover:animate-sliding mr-3"
                style={
                  { "--slide-animation-from": "-8px" } as React.CSSProperties
                }
              >
                <Play className="w-6 h-6 fill-current" />
              </div>
              Watch Now
            </Button>
          </div>

          <p className="text-lg text-gray-300 leading-relaxed line-clamp-3 md:line-clamp-none max-w-xl drop-shadow-md pt-4">
            {filmInfo.overview}
          </p>

          <div className="flex flex-wrap gap-2 pt-4">
            <Badge
              variant="secondary"
              className="backdrop-blur-md bg-background/20 border-white/20 text-white"
            >
              {getReleasedYear(filmInfo.releaseDate)}
            </Badge>
            {filmInfo.genres?.slice(0, 3).map((genre, index) => (
              <Badge
                key={index}
                variant="outline"
                className="border-white/30 text-white bg-white/10 backdrop-blur-sm"
              >
                {genre}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
