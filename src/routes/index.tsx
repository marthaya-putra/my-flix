import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { fetchPopularMovies, fetchTrendingMovies } from "@/lib/data/movies";
import ContentRow from "@/components/content-row";
import Hero from "@/components/hero";
import ContentRowSkeleton from "@/components/content-row-skeleton";
import { fetchTrendingTvs } from "@/lib/data/tvs";

export const Route = createFileRoute("/")({
  component: Home,
  loader: async () => {
    return {
      popularMovies: await fetchPopularMovies(),
      trendingMovies: fetchTrendingMovies(),
      trendingTvs: fetchTrendingTvs(),
    };
  },
});

function Home() {
  const { popularMovies, trendingMovies, trendingTvs } = Route.useLoaderData();
  const mostPopularMovie =
    popularMovies.results.length > 0 ? popularMovies.results[0] : undefined;

  return (
    <div className="relative space-y-8 pb-8">
      {mostPopularMovie && <Hero {...mostPopularMovie} />}
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={trendingMovies}
          children={(data) => (
            <ContentRow title="Trending Movies" items={data.results} />
          )}
        />
      </Suspense>
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={trendingTvs}
          children={(data) => (
            <ContentRow title="Trending TV Shows" items={data.results} />
          )}
        />
      </Suspense>
    </div>
  );
}
