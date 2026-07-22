import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { airingTodayTvsOptions } from "@/lib/queries/tvs";
import MoviesContent from "@/components/movies-content";
import { getUserTimezone } from "@/lib/utils/timezone";
import { z } from "zod";

export const Route = createFileRoute("/tvs/airing-today")({
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    timezone: z.string().optional(),
  }),
  component: TvAiringTodayPage,
  loaderDeps: ({ search }) => ({
    page: search.page,
    timezone: search.timezone || getUserTimezone(), // Auto-detect fallback
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      airingTodayTvsOptions({ page: deps.page, timezone: deps.timezone }),
    );
  },
});

function TvAiringTodayPage() {
  const { page, timezone } = Route.useLoaderDeps();
  const { data: moviesData } = useSuspenseQuery(
    airingTodayTvsOptions({ page, timezone }),
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-foreground mb-2">
          New Episode Today
        </h1>
        <p className="text-muted-foreground">
          Discover TV series airing today from around the world
        </p>
      </div>

      <MoviesContent moviesData={moviesData} from="/tvs/airing-today" />
    </div>
  );
}
