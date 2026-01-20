import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchPopularMovies, fetchTrendingMovies } from "@/lib/data/movies";
import ContentRow from "@/components/content-row";
import Hero from "@/components/hero";
import ContentRowSkeleton from "@/components/content-row-skeleton";
import {
  fetchTrendingTvs,
  fetchAiringTodayTvs,
  fetchOnTheAirTvs,
} from "@/lib/data/tvs";
import { useLikedItems } from "@/hooks/use-liked-items";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    return {
      popularMovies: await fetchPopularMovies(),
      trendingMovies: fetchTrendingMovies(),
      trendingTvs: fetchTrendingTvs(),
      airingTodayTvs: fetchAiringTodayTvs(),
      onTheAirTvs: fetchOnTheAirTvs(),
    };
  },
});

function Home() {
  const {
    popularMovies,
    trendingMovies,
    trendingTvs,
    airingTodayTvs,
    onTheAirTvs,
  } = Route.useLoaderData();
  const mostPopularMovie =
    popularMovies.results.length > 0 ? popularMovies.results[0] : undefined;

  const { isLiked, isToggling, toggleLike } = useLikedItems();

  return (
    <div className="relative space-y-8 pb-8">
      {mostPopularMovie && <Hero {...mostPopularMovie} />}
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={trendingMovies}
          children={(data) => (
            <ContentRow
              title="Trending Movies"
              items={data.results}
              isLiked={isLiked}
              isToggling={isToggling}
              onToggleLike={toggleLike}
            />
          )}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={trendingTvs}
          children={(data) => (
            <ContentRow
              title="Trending TV Shows"
              items={data.results}
              isLiked={isLiked}
              isToggling={isToggling}
              onToggleLike={toggleLike}
            />
          )}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={airingTodayTvs}
          children={(data) => (
            <ContentRow
              title="New Episode Today"
              items={data.results}
              exploreAllUrl="/tvs/airing-today"
              isLiked={isLiked}
              isToggling={isToggling}
              onToggleLike={toggleLike}
            />
          )}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={onTheAirTvs}
          children={(data) => (
            <ContentRow
              title="New Episode This Week"
              items={data.results}
              exploreAllUrl="/tvs/airing-this-week"
              isLiked={isLiked}
              isToggling={isToggling}
              onToggleLike={toggleLike}
            />
          )}
        />
      </Suspense>
    </div>
  );
}
