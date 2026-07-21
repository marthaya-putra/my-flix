import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { WatchlistPage } from "@/components/watchlist/watchlist-page";
import WatchlistSkeleton from "@/components/skeletons/watchlist-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userWatchlistOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/watchlist")({
  // `?page=` mirrors /movies and /tvs — TanStack Router owns the page number
  // in the URL so back/forward and refresh land on the same page.
  validateSearch: z.object({
    page: z.coerce.number().default(1),
  }),
  component: WatchlistComponent,
  beforeLoad: guardAuthenticated,
  loaderDeps: ({ search }) => ({ page: search.page }),
  loader: async ({ context, deps }) => {
    // Prefetch so SSR hydrates the cache and the client doesn't refetch
    // on first mount. The component reads the same options via
    // useSuspenseQuery — same key, no second source of truth.
    await context.queryClient.ensureQueryData(
      userWatchlistOptions(deps.page),
    );
  },
});

function WatchlistComponent() {
  const { page } = Route.useLoaderDeps();
  const { data } = useSuspenseQuery(userWatchlistOptions(page));

  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistPage
        route={Route}
        page={data.page}
        totalPages={data.totalPages}
        totalItems={data.totalItems}
        items={data.watchlist}
      />
    </Suspense>
  );
}
