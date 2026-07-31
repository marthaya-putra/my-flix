import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { FilterPopovers } from "@/components/filter-popovers";
import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { ClearFilters } from "@/components/filters/clear-filters";
import { GenreFilter } from "@/components/filters/genre-filter";
import { RatingFilter } from "@/components/filters/rating-filter";
import { YearFilter } from "@/components/filters/year-filter";
import { MoviesContent } from "@/components/movies-content";
import { DiscoverMoviesSkeleton } from "@/components/skeletons/discover-movies-skeleton";
import { MOVIE_GENRES } from "@/lib/genres";
import { discoverMoviesOptions } from "@/lib/queries/movies";

export const Route = createFileRoute("/movies/")({
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    genres: z.string().optional(),
    rating: z.coerce.number().optional(),
    year: z.coerce.number().optional(),
  }),
  component: MoviesPage,
  pendingComponent: () => <DiscoverMoviesSkeleton />,
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
    <Suspense fallback={<DiscoverMoviesSkeleton />}>
      <div className="mx-auto max-w-[1010px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold text-foreground leading-none">
            Movies
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and explore movies from around the world
            <span className="text-muted-foreground/70"> · </span>
            <span className="tabular-nums">
              {moviesData.results.length} titles on this page
            </span>
          </p>
        </div>

        <FilterPopovers
          chips={<ActiveFilterChips from="/movies/" genreMap={MOVIE_GENRES} />}
        >
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
    </Suspense>
  );
}
