import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { searchMovies } from "@/lib/data/search";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import { z } from "zod";

export const Route = createFileRoute("/movies-search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.number().default(1),
  }),
  component: MoviesSearchPage,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page || 1,
  }),
  loader: async ({ deps }) => {
    return {
      movies: searchMovies({
        data: {
          query: deps.query,
          page: deps.page,
        },
      }),
    };
  },
});

function MoviesSearchPage() {
  const { movies } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Movie results for "{Route.useSearch().query}"
        </h1>
      </div>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await
          promise={movies}
          children={(moviesData) => (
            <MoviesContent
              moviesData={moviesData}
              route={Route}
            />
          )}
        />
      </Suspense>
    </div>
  );
}