import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchDiscoverTvs } from "@/lib/data/tvs";
import { type MovieRouteSearchParams } from "@/lib/types";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";
import TvGenreFilter from "@/components/filters/tv-genre-filter";
import RatingFilter from "@/components/filters/rating-filter";
import YearFilter from "@/components/filters/year-filter";
import ClearFilters from "@/components/filters/clear-filters";
import { useLikedItems } from "@/hooks/use-liked-items";
import { z } from "zod";

export const Route = createFileRoute("/tvs/")({
  validateSearch: z.object({
    page: z.number().default(1),
    genres: z.string().optional(),
    rating: z.number().optional(),
    year: z.number().optional(),
  }),
  component: TVsPage,
  loaderDeps: ({ search }: { search?: MovieRouteSearchParams }) => ({
    page: search?.page || 1,
    genres: search?.genres,
    rating: search?.rating,
    year: search?.year,
  }),
  loader: async ({ deps }) => {
    return {
      movies: fetchDiscoverTvs({
        data: {
          page: deps.page,
          with_genres: deps.genres,
          vote_average_gte: deps.rating,
          year: deps.year,
        },
      }),
    };
  },
});

function TVsPage() {
  const { movies } = Route.useLoaderData();
  const { isLiked, isToggling, toggleLike } = useLikedItems();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">TV Shows</h1>
        <p className="text-muted-foreground">
          Discover and explore TV series from around the world
        </p>
      </div>

      <FilterPopovers>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <TvGenreFilter />
            <RatingFilter route={Route} />
            <YearFilter route={Route} />
          </div>

          <ClearFilters route={Route} />
        </div>
      </FilterPopovers>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await promise={movies}>
          {(moviesData) => (
            <MoviesContent
              moviesData={moviesData}
              route={Route}
              isLiked={isLiked}
              isToggling={isToggling}
              onToggleLike={toggleLike}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );
}
