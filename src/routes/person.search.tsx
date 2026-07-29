import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import PersonContent from "@/components/person-content";
import PersonSearchSkeleton from "@/components/skeletons/person-search-skeleton";
import { searchPeopleOptions } from "@/lib/queries/search";

export const Route = createFileRoute("/person/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.coerce.number().default(1),
  }),
  component: PersonSearchPage,
  pendingComponent: () => <PersonSearchSkeleton />,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      searchPeopleOptions({ query: deps.query, page: deps.page }),
    );
  },
});

function PersonSearchPage() {
  const { query, page } = Route.useLoaderDeps();
  const { data: personData } = useSuspenseQuery(
    searchPeopleOptions({ query, page }),
  );

  return (
    <Suspense fallback={<PersonSearchSkeleton />}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Person results for "{Route.useSearch().query}"
          </h1>
        </div>

        <PersonContent personData={personData} />
      </div>
    </Suspense>
  );
}
