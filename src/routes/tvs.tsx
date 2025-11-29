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

export const Route = createFileRoute("/tvs")({
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
            <RatingFilter routePath="/tvs" />
            <YearFilter routePath="/tvs" />
          </div>

          <ClearFilters routePath="/tvs" />
        </div>
      </FilterPopovers>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await promise={movies}>
          {(moviesData) => (
            <MoviesContent moviesData={moviesData} routePath="/tvs" />
          )}
        </Await>
      </Suspense>
    </div>
  );
}
