import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { MoviesContent } from "@/components/movies-content";
import { SearchResultsSkeleton } from "@/components/skeletons/search-results-skeleton";
import { searchMoviesOptions } from "@/lib/queries/search";

export const Route = createFileRoute("/movies/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.coerce.number().default(1),
  }),
  component: MoviesSearchPage,
  pendingComponent: () => <SearchResultsSkeleton />,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      searchMoviesOptions({ query: deps.query, page: deps.page }),
    );
  },
});

function MoviesSearchPage() {
  const { query, page } = Route.useLoaderDeps();
  const { data: moviesData } = useSuspenseQuery(
    searchMoviesOptions({ query, page }),
  );

  return (
    <Suspense fallback={<SearchResultsSkeleton />}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Movie results for "{Route.useSearch().query}"
          </h1>
        </div>

        <MoviesContent moviesData={moviesData} from="/movies/search" />
      </div>
    </Suspense>
  );
}
