import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { discoverMoviesOptions } from "@/lib/queries/movies";
import MoviesContent from "@/components/movies-content";
import FilterPopovers from "@/components/filter-popovers";
import GenreFilter from "@/components/filters/genre-filter";
import RatingFilter from "@/components/filters/rating-filter";
import YearFilter from "@/components/filters/year-filter";
import ClearFilters from "@/components/filters/clear-filters";
import { z } from "zod";

export const Route = createFileRoute("/movies/")({
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    genres: z.string().optional(),
    rating: z.coerce.number().optional(),
    year: z.coerce.number().optional(),
  }),
  component: MoviesPage,
  loaderDeps: ({ search }) => ({
    page: search.page,
    genres: search.genres ?? "",
    rating: search.rating,
    year: search.year,
  }),
  loader: async ({ context, deps }) => {
    // Prefetch so SSR hydrates the query cache and the client does not
    // refetch on first mount. The component reads the same options via
    // useSuspenseQuery — same key, no second source of truth.
    await context.queryClient.ensureQueryData(
      discoverMoviesOptions({
        page: deps.page,
        genres: deps.genres,
        rating: deps.rating,
        year: deps.year,
      }),
    );
  },
});

function MoviesPage() {
  const { page, genres, rating, year } = Route.useLoaderDeps();
  const { data: moviesData } = useSuspenseQuery(
    discoverMoviesOptions({ page, genres, rating, year }),
  );

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
            <GenreFilter />
            <RatingFilter from="/movies/" />
            <YearFilter from="/movies/" />
          </div>

          <ClearFilters from="/movies/" />
        </div>
      </FilterPopovers>

      <MoviesContent moviesData={moviesData} from="/movies/" />
    </div>
  );
}
