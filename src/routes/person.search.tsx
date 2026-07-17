import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { searchPeopleOptions } from "@/lib/queries/search";
import PersonContent from "@/components/person-content";
import { z } from "zod";

export const Route = createFileRoute("/person/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.coerce.number().default(1),
  }),
  component: PersonSearchPage,
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
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          Person results for "{Route.useSearch().query}"
        </h1>
      </div>

      <PersonContent personData={personData} />
    </div>
  );
}
