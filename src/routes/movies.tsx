import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchDiscoverMovies } from "@/lib/data/movies";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";

export const Route = createFileRoute("/movies")({
  component: MoviesPage,
  validateSearch: (search?: Record<string, unknown>) => {
    return {
      page: search?.page ? Number(search.page) : 1,
      genres: search?.genres as string,
      rating: search?.rating as number,
      year: search?.year as number,
    };
  },
  loaderDeps: ({ search }) => {
    return {
      page: search.page,
      genres: search.genres,
      rating: search.rating,
      year: search.year,
    };
  },
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
      <h1 className="text-3xl font-bold mb-8">Browse Movies</h1>

      <FilterPopovers />

      <Suspense fallback={<MoviesSkeleton />}>
        <Await
          promise={movies}
          children={(moviesData) => <MoviesContent moviesData={moviesData} />}
        />
      </Suspense>
    </div>
  );
}
