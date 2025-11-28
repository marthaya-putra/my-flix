import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchDiscoverMovies, fetchFilteredMovies } from "@/lib/data/movies";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";

export const Route = createFileRoute("/movies")({
  component: MoviesPage,
  validateSearch: (search: Record<string, unknown>) => ({
    page: Number(search.page) || 1,
    genres: (search.genres as string) || "",
    rating: (search.rating as string) || "",
    year: (search.year as string) || "",
  }),
  loaderDeps: ({ search }) => ({
    page: search.page,
    genres: search.genres,
    rating: search.rating,
    year: search.year,
  }),
  loader: async ({ deps }) => {
    const hasFilters = deps.genres || deps.rating || deps.year;

    if (hasFilters) {
      return {
        movies: fetchFilteredMovies({
          data: {
            page: String(deps.page),
            with_genres: deps.genres,
            vote_average_gte: deps.rating,
            year: deps.year,
          }
        }),
      };
    } else {
      return {
        movies: fetchDiscoverMovies({ data: String(deps.page) }),
      };
    }
  },
});

function MoviesPage() {
  const { movies } = Route.useLoaderData();
  const { page, genres, rating, year } = Route.useSearch();

  const handleGenresChange = (newGenres: string[]) => {
    const genresString = newGenres.length > 0 ? newGenres.join(',') : '';
    window.history.pushState(
      {},
      "",
      `/movies?page=1&genres=${genresString}&rating=${rating}&year=${year}`
    );
    window.location.reload();
  };

  const handleRatingChange = (newRating: string) => {
    window.history.pushState(
      {},
      "",
      `/movies?page=1&genres=${genres}&rating=${newRating}&year=${year}`
    );
    window.location.reload();
  };

  const handleYearChange = (newYear: string) => {
    window.history.pushState(
      {},
      "",
      `/movies?page=1&genres=${genres}&rating=${rating}&year=${newYear}`
    );
    window.location.reload();
  };

  const handleClearAll = () => {
    window.history.pushState({}, "", "/movies?page=1");
    window.location.reload();
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Browse Movies</h1>

      <FilterPopovers
        selectedGenres={typeof genres === 'string' && genres ? genres.split(',') : []}
        selectedRating={rating || ''}
        selectedYear={year || ''}
        onGenresChange={handleGenresChange}
        onRatingChange={handleRatingChange}
        onYearChange={handleYearChange}
        onClearAll={handleClearAll}
      />

      <Suspense fallback={<MoviesSkeleton />}>
        <Await
          promise={movies}
          children={(moviesData) => <MoviesContent moviesData={moviesData} />}
        />
      </Suspense>
    </div>
  );
}
