import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { discoverTvsOptions } from "@/lib/queries/tvs";
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
    page: z.coerce.number().default(1),
    genres: z.string().optional(),
    rating: z.coerce.number().optional(),
    year: z.coerce.number().optional(),
  }),
  component: TVsPage,
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
  const { isLiked, toggleLike } = useLikedItems();
  const { page, genres, rating, year } = Route.useLoaderDeps();
  const { data: tvsData } = useSuspenseQuery(
    discoverTvsOptions({ page, genres, rating, year }),
  );

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
            <RatingFilter from="/tvs/" />
            <YearFilter from="/tvs/" />
          </div>

          <ClearFilters from="/tvs/" />
        </div>
      </FilterPopovers>

      <MoviesContent
        moviesData={tvsData}
        from="/tvs/"
        isLiked={isLiked}
        onToggleLike={toggleLike}
      />
    </div>
  );
}
