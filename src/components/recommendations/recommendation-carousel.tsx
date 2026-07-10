import { useEffect, useRef } from "react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "@/components/ui/carousel";
import { cn } from "@/lib/utils";

interface RecommendationCarouselProps {
  children: React.ReactNode;
  itemCount: number;
  /** Scroll to the slide at this index (the first new card after load-more). */
  scrollToFirstNew?: number;
}

const CAROUSEL_BTN =
  "h-15 w-15 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-black/80 disabled:opacity-0 cursor-pointer";

export function RecommendationCarousel({
  children,
  itemCount,
  scrollToFirstNew,
}: RecommendationCarouselProps) {
  const apiRef = useRef<CarouselApi | null>(null);

  const setApi = (api: CarouselApi) => {
    apiRef.current = api;
  };

  // After load-more append, reInit + scroll to the first new card.
  useEffect(() => {
    if (scrollToFirstNew == null || scrollToFirstNew === 0) return;
    const api = apiRef.current;
    if (!api) return;

    // Small delay to let React commit the new CarouselItems.
    const timer = setTimeout(() => {
      api.reInit();
      api.scrollTo(scrollToFirstNew);
    }, 50);

    return () => clearTimeout(timer);
  }, [scrollToFirstNew, itemCount]);

  return (
    <Carousel
      opts={{ align: "start", dragFree: true }}
      setApi={setApi}
      className="w-full group"
    >
      <CarouselContent className="-ml-4">
        {children}
      </CarouselContent>
      <CarouselPrevious
        className={cn(
          "left-0 -translate-x-1/2 top-1/2 -translate-y-1/2",
          CAROUSEL_BTN,
        )}
      />
      <CarouselNext
        className={cn(
          "right-0 translate-x-1/2 top-1/2 -translate-y-1/2",
          CAROUSEL_BTN,
        )}
      />
    </Carousel>
  );
}

interface RecommendationCarouselItemProps {
  children: React.ReactNode;
}

export function RecommendationCarouselItem({
  children,
}: RecommendationCarouselItemProps) {
  return (
    <CarouselItem className="pl-4 basis-1/2 sm:basis-1/3 lg:basis-1/4 xl:basis-1/5 2xl:basis-1/6">
      {children}
    </CarouselItem>
  );
}
