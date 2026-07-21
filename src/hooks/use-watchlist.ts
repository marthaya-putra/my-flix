import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleWatchlistItem } from "@/lib/data/preferences";
import {
  watchlistItemsOptions,
  preferencesKeys,
} from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";
import type { UserWatchlist } from "@/lib/db";

/**
 * Build a watchlist row from a `FilmInfo` so the optimistic update can write
 * to the full-rows cache (`preferencesKeys.userWatchlist()`) that the
 * `/watchlist` grid reads — not just the ids cache. Mirrors the field
 * mapping the server fn persists (see `toggleWatchlistItem`).
 */
function filmInfoToRow(filmInfo: FilmInfo): UserWatchlist {
  const categoryValue = filmInfo.category === "tv" ? "tv-series" : "movie";
  const year = filmInfo.releaseDate
    ? new Date(filmInfo.releaseDate).getFullYear()
    : new Date().getFullYear();
  return {
    id: 0,
    userId: "",
    watchListId: filmInfo.id,
    title: filmInfo.title,
    year,
    category: categoryValue,
    genres: filmInfo.genres?.length ? filmInfo.genres.join(", ") : null,
    posterPath: filmInfo.posterPath || null,
    createdAt: null,
    updatedAt: null,
  };
}

/**
 * Read the user's watchlist ids from the QueryClient cache (populated by the
 * root layout / loaders) and toggle a watchlist entry via `useMutation`.
 *
 * Mirrors `useLikedItems`, but only ever touches the watchlist cache keys —
 * watchlist is orthogonal to likes (see CONTEXT.md → Watchlist), so toggling
 * it must not invalidate or mutate taste state.
 *
 * The mutation applies an optimistic update to the watchlist-items cache,
 * rolls back on error, and on settle invalidates both the ids list and the
 * full-rows list so every read path reflects the new state.
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
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.userWatchlist(),
      });

      const previousIds = queryClient.getQueryData<{ watchlistIds: number[] }>(
        preferencesKeys.watchlistItems(),
      );
      const previousRows = queryClient.getQueryData<{ watchlist: UserWatchlist[] }>(
        preferencesKeys.userWatchlist(),
      );

      // --- ids cache ---
      const prevSet = new Set(previousIds?.watchlistIds ?? []);
      const nextSet = new Set(prevSet);
      const isAdding = !nextSet.has(filmInfo.id);
      if (isAdding) {
        nextSet.add(filmInfo.id);
      } else {
        nextSet.delete(filmInfo.id);
      }
      queryClient.setQueryData(preferencesKeys.watchlistItems(), {
        watchlistIds: [...nextSet],
      });

      // --- rows cache (read by the /watchlist grid) ---
      // So the grid updates optimistically without waiting on the server
      // round-trip, mirror the add/remove on the full-rows list too.
      if (previousRows?.watchlist) {
        const nextRows = isAdding
          ? [...previousRows.watchlist, filmInfoToRow(filmInfo)]
          : previousRows.watchlist.filter(
              (row) => row.watchListId !== filmInfo.id,
            );
        queryClient.setQueryData(preferencesKeys.userWatchlist(), {
          watchlist: nextRows,
        });
      }

      return { previousIds, previousRows };
    },
    onError: (_err, _filmInfo, context) => {
      // Revert on failure.
      if (context?.previousIds) {
        queryClient.setQueryData(
          preferencesKeys.watchlistItems(),
          context.previousIds,
        );
      }
      if (context?.previousRows) {
        queryClient.setQueryData(
          preferencesKeys.userWatchlist(),
          context.previousRows,
        );
      }
    },
    onSettled: () => {
      // Refetch the canonical id list and the full-rows list.
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
