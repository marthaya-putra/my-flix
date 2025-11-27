import { ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { FilmInfo } from "@/lib/types";

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
  return (
    <div className="px-4 md:px-12 group">
      <div className="flex items-end gap-2 group/title cursor-pointer justify-between pb-4">
        <h2 className="text-xl md:text-2xl font-display font-semibold text-white">
          {title}
        </h2>
        {exploreAllUrl && (
          <div className="text-sm text-primary font-medium flex items-center mb-1">
            Explore All <ChevronRight className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="relative">
        <Carousel
          opts={{
            align: "start",
            dragFree: true,
          }}
          className="w-full"
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
          <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 hover:scale-110 disabled:opacity-0 disabled:hover:scale-100 cursor-pointer" />
          <CarouselNext className="right-2 top-1/2 -translate-y-1/2 h-12 w-12 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-black/80 hover:scale-110 disabled:opacity-0 disabled:hover:scale-100 cursor-pointer" />
        </Carousel>
      </div>
    </div>
  );
}
