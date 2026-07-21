import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleWatchlistItem } from "@/lib/data/preferences";
import {
  watchlistItemsOptions,
  preferencesKeys,
} from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";

/**
 * Read the user's watchlist ids from the QueryClient cache (populated by the
 * root layout / loaders) and toggle a watchlist entry via `useMutation`.
 *
 * Mirrors `useLikedItems`, but only ever touches the watchlist cache keys —
 * watchlist is orthogonal to likes (see CONTEXT.md → Watchlist), so toggling
 * it must not invalidate or mutate taste state.
 *
 * The mutation applies an optimistic update to the watchlist-items cache
 * (the id Set every Bookmark CTA reads for its fill state) and rolls back
 * on error. The page-keyed rows cache read by /watchlist is NOT optimistically
 * updated here — /watchlist is the only reader and the only place a remove
 * is visible, so it owns that optimisation locally.
 */
export function useWatchlist() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery(watchlistItemsOptions());
  const watchlistIds = new Set(data?.watchlistIds ?? []);

  const toggleMutation = useMutation({
    mutationFn: (filmInfo: FilmInfo) => {
      const { id, title, releaseDate, category, genres } = filmInfo;
      const year = releaseDate
        ? new Date(releaseDate).getFullYear()
        : new Date().getFullYear();
      const categoryValue = category === "tv" ? "tv-series" : "movie";

      return toggleWatchlistItem({
        data: {
          watchListId: id,
          title,
          year,
          category: categoryValue,
          genres,
          posterPath: filmInfo.posterPath,
        },
      });
    },
    onMutate: async (filmInfo) => {
      // Cancel in-flight reads so they don't clobber the optimistic update.
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.watchlistItems(),
      });

      const previous = queryClient.getQueryData<{ watchlistIds: number[] }>(
        preferencesKeys.watchlistItems(),
      );

      const prevSet = new Set(previous?.watchlistIds ?? []);
      const nextSet = new Set(prevSet);
      if (nextSet.has(filmInfo.id)) {
        nextSet.delete(filmInfo.id);
      } else {
        nextSet.add(filmInfo.id);
      }

      queryClient.setQueryData(preferencesKeys.watchlistItems(), {
        watchlistIds: [...nextSet],
      });

      return { previous };
    },
    onError: (_err, _filmInfo, context) => {
      if (context?.previous) {
        queryClient.setQueryData(
          preferencesKeys.watchlistItems(),
          context.previous,
        );
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.watchlistItems(),
      });
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.userWatchlist(),
      });
    },
  });

  const isWatchlisted = (id: number) => watchlistIds.has(id);
  const toggleWatchlist = (filmInfo: FilmInfo) => {
    void toggleMutation.mutate(filmInfo);
  };

  return {
    isWatchlisted,
    toggleWatchlist,
    // True while the initial watchlist read is loading.
    isPending,
    // True while a toggle is in flight.
    isToggling: toggleMutation.isPending,
  };
}
