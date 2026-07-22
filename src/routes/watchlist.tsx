import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
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
  // No route `loader`: the rows cache is intentionally NOT awaited here.
  // Awaiting it (ensureQueryData) blocks the loader past defaultPendingMs
  // on the first client navigation, surfacing the global spinner. Instead
  // the component streams the data via useQuery + WatchlistSkeleton — same
  // pattern as the home route's timezone-dependent rows (no hydration
  // mismatch because both server and client render the skeleton until the
  // client fetch resolves).
});

function WatchlistComponent() {
  const { page } = Route.useLoaderDeps();
  const { data, isPending } = useQuery(userWatchlistOptions(page));

  if (isPending || !data) return <WatchlistSkeleton />;

  return (
    <WatchlistPage
      page={data.page}
      totalPages={data.totalPages}
      totalItems={data.totalItems}
      items={data.watchlist}
    />
  );
}
