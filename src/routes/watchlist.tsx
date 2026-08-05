import { useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { z } from "zod";
import { WatchlistSkeleton } from "@/components/skeletons/watchlist-skeleton";
import { WatchlistPage } from "@/components/watchlist/watchlist-page";
import { guardAuthenticated } from "@/lib/auth-guard";
import {
  userWatchlistOptions,
  watchlistItemsOptions,
} from "@/lib/queries/preferences";

export const Route = createFileRoute("/watchlist")({
  // `?page=` mirrors /movies and /tvs — TanStack Router owns the page number
  // in the URL so back/forward and refresh land on the same page.
  validateSearch: z.object({
    page: z.coerce.number().default(1),
  }),
  component: WatchlistComponent,
  // Override the global spinner — parity with /movies, /tvs, etc. Covers the
  // route-pending phase (cold client nav while guardAuthenticated resolves
  // the session, or the code-split chunk loads) before this component mounts.
  // The in-component <Suspense fallback={<WatchlistSkeleton />}> below still
  // owns the data-fetch suspense; this only fills the route-resolution gap.
  pendingComponent: () => <WatchlistSkeleton />,
  beforeLoad: guardAuthenticated,
  loaderDeps: ({ search }) => ({ page: search.page }),
  // Resolve both queries during SSR so the server streams the resolved grid
  // (with poster placeholders) instead of holding on the skeleton until the
  // client mounts. Mirrors /movies's loader pattern. The in-component
  // <Suspense fallback={<WatchlistSkeleton />}> still owns client-side
  // nav + the code-split chunk load; this loader only shortens the SSR
  // streaming gap so the bg-muted card placeholders appear sooner.
  loader: async ({ context, deps }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(userWatchlistOptions(deps.page)),
      context.queryClient.ensureQueryData(watchlistItemsOptions()),
    ]);
  },
});

function WatchlistComponent() {
  const { page } = Route.useLoaderDeps();

  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistPageContent page={page} />
    </Suspense>
  );
}

function WatchlistPageContent({ page }: { page: number }) {
  const { data } = useSuspenseQuery(userWatchlistOptions(page));
  // Warm the ids cache before the page mounts. The page reads the same key
  // via useWatchlist() (deduped, no extra fetch) for both filtering and the
  // optimistic card-vanish on un-bookmark; resolving it under this boundary
  // means the grid never renders before isWatchlisted(*) can return true.
  useSuspenseQuery(watchlistItemsOptions());

  return (
    <WatchlistPage
      page={data.page}
      totalPages={data.totalPages}
      totalItems={data.totalItems}
      items={data.watchlist}
    />
  );
}
