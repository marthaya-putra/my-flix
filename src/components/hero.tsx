import { Play, Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FilmInfo } from "@/lib/types";
import { getReleasedYear } from "@/lib/utils";
import { PlayLink } from "./play-link";
import { motion } from "motion/react";

export default function Hero(filmInfo: FilmInfo) {
  return (
    <div className="relative w-full h-[50vh] min-h-[400px] overflow-hidden">
      {/* Backdrop — fade-in only, content just appears with it */}
      <div
        className="absolute inset-0 w-full h-full bg-cover bg-center animate-in fade-in duration-1000"
        style={{ backgroundImage: `url(${filmInfo.backdropPath})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
      </div>

      <div className="relative h-full flex px-4 md:px-12 max-w-7xl mx-auto">
        {/* Single gentle entrance — tween, no spring bounce, slight rise */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut", delay: 0.3 }}
          className="max-w-2xl flex flex-col justify-center"
        >
          <h1 className="text-3xl md:text-5xl font-display font-black text-white leading-none drop-shadow-2xl">
            {filmInfo.title}
          </h1>

          <div className="flex flex-wrap gap-8 pt-4">
            <div className="flex items-center gap-1 text-sm text-yellow-400">
              <Star className="w-5 h-5 fill-current" />
              <span className="text-white font-semibold">
                {filmInfo.voteAverage.toFixed(1)}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="secondary"
                className="backdrop-blur-md bg-black/30 border-white/15 text-white"
              >
                {getReleasedYear(filmInfo.releaseDate)}
              </Badge>
              {filmInfo.genres?.slice(0, 3).map((genre, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="border-white/15 text-white bg-black/20 backdrop-blur-sm"
                >
                  {genre}
                </Badge>
              ))}
            </div>
          </div>

          <p className="text-base text-white/80 leading-relaxed line-clamp-3 md:line-clamp-none max-w-xl drop-shadow-md pt-4">
            {filmInfo.overview}
          </p>

          <div className="pt-6">
            <PlayLink title={filmInfo.title} category={filmInfo.category}>
              <Button
                size="lg"
                className="group bg-primary hover:bg-primary/90 text-white font-bold rounded-full px-10 py-4 text-lg tracking-wide shadow-lg hover:shadow-xl active:scale-[0.97] transition-[transform,box-shadow] duration-200"
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
            </PlayLink>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
