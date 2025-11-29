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

interface ContentRowProps {
  title: string;
  items: Array<
    FilmInfo & {
      match?: string;
    }
  >;
  exploreAllUrl?: string;
}

export default function ContentRow({
  title,
  items,
  exploreAllUrl,
}: ContentRowProps) {
  const carouselButtonClassName =
    "h-15 w-15 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80 disabled:opacity-0  cursor-pointer group-hover:[&_svg]:animate-sliding group-hover:[&_svg]:delay-300";

  return (
    <div className="px-4 md:px-12 group">
      <div className="flex items-end gap-2 justify-between pb-4">
        <h2 className="text-xl md:text-2xl font-display font-semibold text-white">
          {title}
        </h2>
        {exploreAllUrl && (
          <Link
            to={exploreAllUrl}
            className="text-sm text-white font-medium flex items-center mb-1 hover:text-primary/90 transition-colors duration-200"
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
                <MovieCard {...item} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious
            className={cn(
              "left-0 -translate-x-1/2 top-1/2 -translate-y-1/2",
              carouselButtonClassName
            )}
            style={{ "--slide-animation-from": "-5px" } as React.CSSProperties}
          />
          <CarouselNext
            className={cn(
              "right-0 translate-x-1/2 top-1/2 -translate-y-1/2",
              carouselButtonClassName
            )}
            style={{ "--slide-animation-from": "5px" } as React.CSSProperties}
          />
        </Carousel>
      </div>
    </div>
  );
}
