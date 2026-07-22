import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { searchTvsOptions } from "@/lib/queries/search";
import MoviesContent from "@/components/movies-content";
import { z } from "zod";

export const Route = createFileRoute("/tvs/search")({
  validateSearch: z.object({
    query: z.string(),
    page: z.coerce.number().default(1),
  }),
  component: TvsSearchPage,
  loaderDeps: ({ search }) => ({
    query: search.query,
    page: search.page,
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      searchTvsOptions({ query: deps.query, page: deps.page }),
    );
  },
});

function TvsSearchPage() {
  const { query, page } = Route.useLoaderDeps();
  const { data: tvsData } = useSuspenseQuery(
    searchTvsOptions({ query, page }),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          TV results for "{Route.useSearch().query}"
        </h1>
      </div>

      <MoviesContent moviesData={tvsData} from="/tvs/search" />
    </div>
  );
}
