import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  useSuspenseQuery,
  useQuery,
  type UseQueryOptions,
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
    await context.queryClient.ensureQueryData(popularMoviesOptions());
    // Trending rows are below the fold and render inside their own Suspense
    // boundaries, so `prefetchQuery` (best-effort, non-blocking) is the
    // right tool — a miss just shows the row skeleton until it resolves.
    await Promise.all([
      context.queryClient.prefetchQuery(trendingMoviesOptions()),
      context.queryClient.prefetchQuery(trendingTvsOptions()),
    ]);
    // The "New Episode Today/This Week" rows are intentionally NOT
    // prefetched: their query keys embed the user's timezone
    // (`getUserTimezone()`), which differs between server and browser.
    // Prefetching on the server would populate a cache the client can't
    // hit, and SSR-rendered titles would mismatch the client render
    // (React hydration error #418). Those rows use `useQuery` (below),
    // which — without a prefetched cache — renders the skeleton on both
    // server and first client render, then fetches with the browser
    // timezone after mount.
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
      <ContentRowSection
        title="New Episode Today"
        exploreAllUrl="/tvs/airing-today"
        options={airingTodayTvsOptions({ page: 1, timezone })}
        handlers={handlers}
      />
      <ContentRowSection
        title="New Episode This Week"
        exploreAllUrl="/tvs/airing-this-week"
        options={onTheAirTvsOptions({ page: 1, timezone })}
        handlers={handlers}
      />
    </div>
  );
}

/**
 * Renders one home section.
 *
 * - Prefetched rows (trending) arrive via `useSuspenseQuery` inside a
 *   `<Suspense>` boundary — cache hits resolve synchronously, slow loads
 *   reveal the skeleton.
 * - Non-prefetched rows (timezone-dependent "New Episode …") use
 *   `useQuery`: the server and the first client render both find an empty
 *   cache, so both render the skeleton (no hydration mismatch); the client
 *   then fetches with the browser timezone and swaps content in.
 */
function ContentRowSection({
  title,
  options,
  exploreAllUrl,
  handlers,
}: {
  title: string;
  options: UseQueryOptions<DiscoverResult>;
  exploreAllUrl?: string;
  handlers: RowHandlers;
}) {
  const { data, isPending } = useQuery(options);
  if (isPending || !data) return <ContentRowSkeleton />;
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
