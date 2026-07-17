import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  type UseSuspenseQueryOptions,
} from "@tanstack/react-query";
import type { DiscoverResult } from "@/lib/types";
import ContentRow from "@/components/content-row";
import Hero from "@/components/hero";
import ContentRowSkeleton from "@/components/content-row-skeleton";
import { popularMoviesOptions, trendingMoviesOptions } from "@/lib/queries/movies";
import {
  airingTodayTvsOptions,
  onTheAirTvsOptions,
  trendingTvsOptions,
} from "@/lib/queries/tvs";
import { getUserTimezone } from "@/lib/utils/timezone";
import { useLikedItems } from "@/hooks/use-liked-items";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async ({ context }) => {
    // `ensureQueryData` for popular movies: the Hero is above the fold, so
    // the fetch must populate the cache (and surface errors) before SSR —
    // a miss would force the client to refetch and flash a pending Hero.
    const timezone = getUserTimezone();
    await context.queryClient.ensureQueryData(popularMoviesOptions());
    // The rows are below the fold and render inside their own Suspense
    // boundaries, so `prefetchQuery` (best-effort, non-blocking) is the
    // right tool — a miss just shows the row skeleton until it resolves.
    await Promise.all([
      context.queryClient.prefetchQuery(trendingMoviesOptions()),
      context.queryClient.prefetchQuery(trendingTvsOptions()),
      context.queryClient.prefetchQuery(
        airingTodayTvsOptions({ page: 1, timezone }),
      ),
      context.queryClient.prefetchQuery(
        onTheAirTvsOptions({ page: 1, timezone }),
      ),
    ]);
  },
});

type RowHandlers = Pick<
  ReturnType<typeof useLikedItems>,
  "isLiked" | "toggleLike"
>;

function Home() {
  const handlers = useLikedItems();
  const timezone = getUserTimezone();

  // Popular drives the Hero — resolve synchronously with the SSR render.
  const { data: popularMovies } = useSuspenseQuery(popularMoviesOptions());
  const mostPopularMovie =
    popularMovies.results.length > 0 ? popularMovies.results[0] : undefined;

  return (
    <div className="relative space-y-8 pb-8">
      {mostPopularMovie && <Hero {...mostPopularMovie} />}
      <Suspense fallback={<ContentRowSkeleton />}>
        <ContentRowSection
          title="Trending Movies"
          options={trendingMoviesOptions()}
          handlers={handlers}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <ContentRowSection
          title="Trending TV Shows"
          options={trendingTvsOptions()}
          handlers={handlers}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <ContentRowSection
          title="New Episode Today"
          exploreAllUrl="/tvs/airing-today"
          options={airingTodayTvsOptions({ page: 1, timezone })}
          handlers={handlers}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <ContentRowSection
          title="New Episode This Week"
          exploreAllUrl="/tvs/airing-this-week"
          options={onTheAirTvsOptions({ page: 1, timezone })}
          handlers={handlers}
        />
      </Suspense>
    </div>
  );
}

/**
 * Renders one home section: resolves its own query (already prefetched by
 * the loader) inside its parent Suspense boundary, so slow rows reveal
 * independently without blocking the Hero.
 */
function ContentRowSection({
  title,
  options,
  exploreAllUrl,
  handlers,
}: {
  title: string;
  options: UseSuspenseQueryOptions<DiscoverResult>;
  exploreAllUrl?: string;
  handlers: RowHandlers;
}) {
  const { data } = useSuspenseQuery(options);
  return (
    <ContentRow
      title={title}
      items={data.results}
      exploreAllUrl={exploreAllUrl}
      isLiked={handlers.isLiked}
      onToggleLike={handlers.toggleLike}
    />
  );
}
