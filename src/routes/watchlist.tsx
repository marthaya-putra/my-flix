import { createFileRoute } from "@tanstack/react-router";
import { Suspense } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { WatchlistPage } from "@/components/watchlist/watchlist-page";
import WatchlistSkeleton from "@/components/skeletons/watchlist-skeleton";
import { guardAuthenticated } from "@/lib/auth-guard";
import { userWatchlistOptions } from "@/lib/queries/preferences";

export const Route = createFileRoute("/watchlist")({
  component: WatchlistComponent,
  beforeLoad: guardAuthenticated,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(userWatchlistOptions());
  },
});

function WatchlistComponent() {
  const { data } = useSuspenseQuery(userWatchlistOptions());

  return (
    <Suspense fallback={<WatchlistSkeleton />}>
      <WatchlistPage items={data.watchlist} />
    </Suspense>
  );
}
