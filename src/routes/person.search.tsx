import { Suspense } from "react";
import { Await, createFileRoute } from "@tanstack/react-router";
import { searchActors } from "@/lib/data/search";
import PersonSkeleton from "@/components/person-skeleton";
import PersonContent from "@/components/person-content";
import { z } from "zod";

export const Route = createFileRoute("/person/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.number().default(1),
  }),
  component: PersonSearchPage,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page || 1,
  }),
  loader: async ({ deps }) => {
    return {
      people: searchActors({
        data: {
          query: deps.query,
          page: deps.page,
        },
      }),
    };
  },
});

function PersonSearchPage() {
  const { people } = Route.useLoaderData();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Person results for "{Route.useSearch().query}"
        </h1>
      </div>

      <Suspense fallback={<PersonSkeleton />}>
        <Await
          promise={people}
          children={(personData) => (
            <PersonContent
              personData={personData}
            />
          )}
        />
      </Suspense>
    </div>
  );
}