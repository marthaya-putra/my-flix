import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { FilterPopovers } from "@/components/filter-popovers";
import { ActiveFilterChips } from "@/components/filters/active-filter-chips";
import { ClearFilters } from "@/components/filters/clear-filters";
import { RatingFilter } from "@/components/filters/rating-filter";
import { TvGenreFilter } from "@/components/filters/tv-genre-filter";
import { YearFilter } from "@/components/filters/year-filter";
import { MoviesContent } from "@/components/movies-content";
import { DiscoverTvsSkeleton } from "@/components/skeletons/discover-tvs-skeleton";
import { TV_GENRES } from "@/lib/genres";
import { discoverTvsOptions } from "@/lib/queries/tvs";

export const Route = createFileRoute("/tvs/")({
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    genres: z.string().optional(),
    rating: z.coerce.number().optional(),
    year: z.coerce.number().optional(),
  }),
  component: TVsPage,
  pendingComponent: () => <DiscoverTvsSkeleton />,
  loaderDeps: ({ search }) => ({
    page: search.page,
    genres: search.genres ?? "",
    rating: search.rating,
    year: search.year,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      discoverTvsOptions({
        page: deps.page,
        genres: deps.genres,
        rating: deps.rating,
        year: deps.year,
      }),
    );
  },
});

function TVsPage() {
  const { page, genres, rating, year } = Route.useLoaderDeps();
  const { data: tvsData } = useSuspenseQuery(
    discoverTvsOptions({ page, genres, rating, year }),
  );

  return (
    <Suspense fallback={<DiscoverTvsSkeleton />}>
      <div className="mx-auto max-w-[1010px] px-4 py-8">
        <div className="mb-6">
          <h1 className="text-4xl font-display font-bold text-foreground leading-none">
            TV Shows
          </h1>
          <p className="text-muted-foreground mt-2">
            Discover and explore TV series from around the world
            <span className="text-muted-foreground/70"> · </span>
            <span className="tabular-nums">
              {tvsData.results.length} titles on this page
            </span>
          </p>
        </div>

        <FilterPopovers
          chips={<ActiveFilterChips from="/tvs/" genreMap={TV_GENRES} />}
        >
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-4 flex-wrap">
              <TvGenreFilter />
              <RatingFilter from="/tvs/" />
              <YearFilter from="/tvs/" />
            </div>

            <ClearFilters from="/tvs/" />
          </div>
        </FilterPopovers>

        <MoviesContent moviesData={tvsData} from="/tvs/" />
      </div>
    </Suspense>
  );
}
