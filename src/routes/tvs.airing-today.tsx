import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchAiringTodayTvs } from "@/lib/data/tvs";
import { type MovieRouteSearchParams } from "@/lib/types";
import MoviesSkeleton from "@/components/movies-skeleton";
import MoviesContent from "@/components/movies-content";
import { getUserTimezone } from "@/lib/utils/timezone";
import { useLikedItems } from "@/hooks/use-liked-items";
import { z } from "zod";

export const Route = createFileRoute("/tvs/airing-today")({
  validateSearch: z.object({
    page: z.number().default(1),
    timezone: z.string().optional(),
  }),
  component: TvAiringTodayPage,
  loaderDeps: ({ search }: { search?: MovieRouteSearchParams & { timezone?: string } }) => ({
    page: search?.page || 1,
    timezone: search?.timezone || getUserTimezone(), // Auto-detect fallback
  }),
  loader: async ({ deps }) => {
    return {
      movies: fetchAiringTodayTvs({
        data: deps,
      }),
    };
  },
});

function TvAiringTodayPage() {
  const { movies } = Route.useLoaderData();
  const { isLiked, toggleLike } = useLikedItems();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          New Episode Today
        </h1>
        <p className="text-muted-foreground">
          Discover TV series airing today from around the world
        </p>
      </div>

      <Suspense fallback={<MoviesSkeleton />}>
        <Await promise={movies}>
          {(moviesData) => (
            <MoviesContent
              moviesData={moviesData}
              route={Route}
              isLiked={isLiked}
              onToggleLike={toggleLike}
            />
          )}
        </Await>
      </Suspense>
    </div>
  );
}
