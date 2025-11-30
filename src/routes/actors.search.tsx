import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { searchActors } from "@/lib/data/search";
import ActorsSkeleton from "@/components/actors-skeleton";
import ActorsContent from "@/components/actors-content";
import { z } from "zod";

export const Route = createFileRoute("/actors/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.number().default(1),
  }),
  component: ActorsSearchPage,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page || 1,
  }),
  loader: async ({ deps }) => {
    return {
      actors: searchActors({
        data: {
          query: deps.query,
          page: deps.page,
        },
      }),
    };
  },
});

function ActorsSearchPage() {
  const { actors } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Actor results for "{Route.useSearch().query}"
        </h1>
      </div>

      <Suspense fallback={<ActorsSkeleton />}>
        <Await
          promise={actors}
          children={(actorsData) => (
            <ActorsContent
              actorsData={actorsData}
            />
          )}
        />
      </Suspense>
    </div>
  );
}