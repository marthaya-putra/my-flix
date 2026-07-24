import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { onTheAirTvsOptions } from "@/lib/queries/tvs";
import AiringThisWeekSkeleton from "@/components/skeletons/airing-this-week-skeleton";
import MoviesContent from "@/components/movies-content";
import { getUserTimezone } from "@/lib/utils/timezone";
import { z } from "zod";

export const Route = createFileRoute("/tvs/airing-this-week")({
  validateSearch: z.object({
    page: z.coerce.number().default(1),
    timezone: z.string().optional(),
  }),
  component: TvAiringThisWeekPage,
  pendingComponent: () => <AiringThisWeekSkeleton />,
  loaderDeps: ({ search }) => ({
    page: search.page,
    timezone: search.timezone || getUserTimezone(), // Auto-detect fallback
  }),
  loader: async ({ context, deps }) => {
    await context.queryClient.ensureQueryData(
      onTheAirTvsOptions({ page: deps.page, timezone: deps.timezone }),
    );
  },
});

function TvAiringThisWeekPage() {
  const { page, timezone } = Route.useLoaderDeps();
  const { data: moviesData } = useSuspenseQuery(
    onTheAirTvsOptions({ page, timezone }),
  );

  return (
    <Suspense fallback={<AiringThisWeekSkeleton />}>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">
            New Episode This Week
          </h1>
          <p className="text-muted-foreground">
            Discover TV series with new episodes airing this week from around
            the world
          </p>
        </div>

        <MoviesContent moviesData={moviesData} from="/tvs/airing-this-week" />
      </div>
    </Suspense>
  );
}
