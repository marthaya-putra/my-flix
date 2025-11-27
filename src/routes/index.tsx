import { Suspense } from "react";
import { Await, createFileRoute, useRouter } from "@tanstack/react-router";
import { fetchTrendingMovies } from "@/lib/data/movies";
import ContentRow from "@/components/ContentRow";
import Hero from "@/components/Hero";
import ContentRowSkeleton from "@/components/ContentRowSkeleton";

export const Route = createFileRoute("/")({
  component: Home,
  loader: () => {
    return { trendingMovies: fetchTrendingMovies() };
  },
});

function Home() {
  const router = useRouter();
  const { trendingMovies } = Route.useLoaderData();

  return (
    <div className="relative space-y-8">
      <Hero />
      <Suspense fallback={<ContentRowSkeleton />}>
        <Await
          promise={trendingMovies}
          children={(data) => (
            <ContentRow title="Trending movies" items={data.results} />
          )}
        />
      </Suspense>
    </div>
  );
}
