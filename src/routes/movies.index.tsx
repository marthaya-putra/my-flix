import { Suspense } from "react";
import { Await, createFileRoute, useNavigate } from "@tanstack/react-router";
import { fetchDiscoverMovies } from "@/lib/data/movies";
import { type MovieRouteSearchParams } from "@/lib/types";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";
import GenreFilter from "@/components/filters/genre-filter";
import RatingFilter from "@/components/filters/rating-filter";
import YearFilter from "@/components/filters/year-filter";
import ClearFilters from "@/components/filters/clear-filters";
import { z } from "zod";

export const Route = createFileRoute("/movies/")({
  validateSearch: z.object({
    page: z.number().default(1),
    genres: z.string().optional(),
    rating: z.number().optional(),
    year: z.number().optional(),
  }),
  component: MoviesPage,
  loaderDeps: ({ search }: { search?: MovieRouteSearchParams }) => ({
    page: search?.page || 1,
    genres: search?.genres ? search.genres : "",
    rating: search?.rating,
    year: search?.year,
  }),
  loader: async ({ deps }) => {
    return {
      movies: fetchDiscoverMovies({
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

function MoviesPage() {
  const { movies } = Route.useLoaderData();
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Movies</h1>
        <p className="text-muted-foreground">
          Discover and explore movies from around the world
        </p>
      </div>

      <FilterPopovers>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <GenreFilter route={Route} />
            <RatingFilter route={Route} />
            <YearFilter route={Route} />
          </div>

          <ClearFilters route={Route} />
        </div>
      </FilterPopovers>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await
          promise={movies}
          children={(moviesData) => (
            <MoviesContent moviesData={moviesData} route={Route} />
          )}
        />
      </Suspense>
    </div>
  );
}
