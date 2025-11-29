import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchDiscoverMovies } from "@/lib/data/movies";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";
import GenreFilter from "@/components/filters/genre-filter";
import RatingFilter from "@/components/filters/rating-filter";
import YearFilter from "@/components/filters/year-filter";
import ClearFilters from "@/components/filters/clear-filters";

export const Route = createFileRoute("/movies")({
  component: MoviesPage,
  validateSearch: (search?: Record<string, unknown>) => {
    return {
      page: search?.page ? Number(search.page) : 1,
      genres: search?.genres as string || undefined,
      rating: search?.rating as number || undefined,
      year: search?.year as number || undefined,
    };
  },
  loaderDeps: ({ search }) => ({
    page: search.page,
    genres: search.genres,
    rating: search.rating,
    year: search.year,
  }),
  loader: async ({ deps }) => {
    return {
      movies: fetchDiscoverMovies({
        data: {
          page: String(deps.page),
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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">Movies</h1>
        <p className="text-muted-foreground">Discover and explore movies from around the world</p>
      </div>

      <FilterPopovers>
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-4 flex-wrap">
            <GenreFilter />
            <RatingFilter routePath="/movies" />
            <YearFilter routePath="/movies" />
          </div>

          <ClearFilters routePath="/movies" />
        </div>
      </FilterPopovers>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await
          promise={movies}
          children={(moviesData) => <MoviesContent moviesData={moviesData} routePath="/movies" />}
        />
      </Suspense>
    </div>
  );
}
