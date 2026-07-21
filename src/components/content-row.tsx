import { ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import MovieCard from "./movie-card";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FilmInfo } from "@/lib/types";
import { cn } from "@/lib/utils";

/** Shared glass carousel button class — used by ContentRow and RecommendationCarousel */
export const CAROUSEL_BUTTON_CLASS =
  "h-12 w-12 rounded-full backdrop-blur-md bg-black/50 border border-white/15 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/70 disabled:opacity-0 cursor-pointer group-hover:[&_svg]:animate-sliding group-hover:[&_svg]:delay-300";

interface ContentRowProps {
  title: React.ReactNode;
  items: Array<
    FilmInfo & {
      match?: string;
    }
  >;
  exploreAllUrl?: string;
  className?: string;
  isLiked?: (id: number) => boolean;
  onToggleLike?: (filmInfo: FilmInfo) => void;
  isWatchlisted?: (id: number) => boolean;
  onToggleWatchlist?: (filmInfo: FilmInfo) => void;
}

export default function ContentRow({
  title,
  items,
  exploreAllUrl,
  className,
  isLiked,
  onToggleLike,
  isWatchlisted,
  onToggleWatchlist,
}: ContentRowProps) {
  return (
    <div className={cn("px-4 md:px-8 group max-w-7xl mx-auto", className)}>
      <div className="flex items-end gap-2 justify-between pb-2">
        {typeof title === "string" ? (
          <h2 className="text-lg md:text-xl font-display font-semibold text-foreground">
            {title}
          </h2>
        ) : (
          title
        )}
        {exploreAllUrl && (
          <Link
            to={exploreAllUrl}
            className="text-sm text-muted-foreground font-medium flex items-center mb-1 hover:text-primary transition-colors duration-200"
          >
            Explore All <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        )}
      </div>

      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full group"
        >
          <CarouselContent className="-ml-4">
            {items.map((item, index) => (
              <CarouselItem
                key={item.id || index}
                className="pl-4 basis-1/2 sm:basis-1/3 md:basis-1/4 lg:basis-1/5 xl:basis-1/6"
              >
                <MovieCard
                  {...item}
                  isLiked={isLiked?.(item.id)}
                  onToggleLike={onToggleLike}
                  isWatchlisted={isWatchlisted?.(item.id)}
                  onToggleWatchlist={onToggleWatchlist}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className={cn(
              "left-0 -translate-x-1/2 top-1/2 -translate-y-1/2",
              CAROUSEL_BUTTON_CLASS
            )}
            style={{ "--slide-animation-from": "5px" } as React.CSSProperties}
          />
          <CarouselNext
            className={cn(
              "right-0 translate-x-1/2 top-1/2 -translate-y-1/2",
              CAROUSEL_BUTTON_CLASS
            )}
            style={{ "--slide-animation-from": "-5px" } as React.CSSProperties}
          />
        </Carousel>
      </div>
    </div>
  );
}
