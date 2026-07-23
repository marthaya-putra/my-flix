import { Suspense } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { z } from "zod";
import { WatchlistPage } from "@/components/watchlist/watchlist-page";
import WatchlistSkeleton from "@/components/skeletons/watchlist-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userWatchlistOptions, watchlistItemsOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/watchlist")({
  // `?page=` mirrors /movies and /tvs — TanStack Router owns the page number
  // in the URL so back/forward and refresh land on the same page.
  validateSearch: z.object({
    page: z.coerce.number().default(1),
  }),
  component: WatchlistComponent,
  beforeLoad: guardAuthenticated,
  loaderDeps: ({ search }) => ({ page: search.page }),
  // No route `loader`: awaiting it (ensureQueryData) blocks past
  // defaultPendingMs on the first client navigation, surfacing the global
  // spinner. Instead the queries are streamed during render via
  // useSuspenseQuery under a <Suspense> boundary — server streams the
  // skeleton, then resolves and dehydrates the cache (same streaming model
  // as the home route's timezone-dependent rows). The boundary holds both
  // the page-keyed rows cache and the ids cache, so the cards (which are
  // `items.filter(isWatchlisted(...))`) never flash an empty grid.
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
