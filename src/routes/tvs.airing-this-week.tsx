import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchOnTheAirTvs } from "@/lib/data/tvs";
import { type MovieRouteSearchParams } from "@/lib/types";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import { getUserTimezone } from "@/lib/utils/timezone";
import { z } from "zod";

export const Route = createFileRoute("/tvs/airing-this-week")({
  validateSearch: z.object({
    page: z.number().default(1),
    timezone: z.string().optional(),
  }),
  component: TvAiringThisWeekPage,
  loaderDeps: ({ search }) => ({
    page: search?.page || 1,
    timezone: search?.timezone || getUserTimezone(), // Auto-detect fallback
  }),
  loader: async ({ deps }) => {
    return {
      movies: fetchOnTheAirTvs({
        data: deps,
      }),
    };
  },
});

function TvAiringThisWeekPage() {
  const { movies } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          New Episode This Week
        </h1>
        <p className="text-muted-foreground">
          Discover TV series with new episodes airing this week from around the world
        </p>
      </div>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await promise={movies}>
          {(moviesData) => (
            <MoviesContent
              moviesData={moviesData}
              route={Route}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );
}