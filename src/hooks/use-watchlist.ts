import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleWatchlistItem } from "@/lib/data/preferences";
import { watchlistItemsOptions, preferencesKeys } from "@/lib/queries/preferences";
import { WATCHLIST_PAGE_SIZE } from "@/lib/utils";
import type { FilmInfo, FilmType } from "@/lib/types";
import type { UserWatchlist } from "@/lib/db";

/** Shape of each cached /watchlist page. */
type WatchlistPageData = {
  watchlist: UserWatchlist[];
  page: number;
  totalPages: number;
  totalItems: number;
};

/**
 * Build a watchlist row from a `FilmInfo` so an optimistic add can append to
 * the cached rows list. Mirrors the field mapping the server fn persists.
 */
function filmInfoToRow(filmInfo: FilmInfo): UserWatchlist {
  const categoryValue: "movie" | "tv-series" =
    filmInfo.category === "tv" ? "tv-series" : "movie";
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
 * The mutation applies optimistic updates to BOTH:
 *   - the ids cache (the id Set every Bookmark CTA reads for its fill state),
 *   - the page-keyed rows cache (`preferencesKeys.userWatchlist()`, read by
 *     /watchlist). Remove drops the row from every cached page and adjusts
 *     the totals; add appends to the highest cached page.
 * Both roll back on error; onSettled invalidates the canonical sources.
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
      // Cancel in-flight reads on both caches so they don't clobber the
      // optimistic update.
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.watchlistItems(),
      });
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.userWatchlist(),
      });

      // --- snapshot for rollback ---
      const previousIds = queryClient.getQueryData<{ watchlistIds: number[] }>(
        preferencesKeys.watchlistItems(),
      );
      const previousRows = queryClient.getQueriesData<WatchlistPageData>({
        queryKey: preferencesKeys.userWatchlist(),
      });

      // --- ids cache ---
      const prevSet = new Set(previousIds?.watchlistIds ?? []);
      const isAdding = !prevSet.has(filmInfo.id);
      const nextSet = new Set(prevSet);
      if (isAdding) {
        nextSet.add(filmInfo.id);
      } else {
        nextSet.delete(filmInfo.id);
      }
      queryClient.setQueryData(preferencesKeys.watchlistItems(), {
        watchlistIds: [...nextSet],
      });

      // --- rows cache (read by /watchlist) ---
      if (previousRows.length > 0) {
        if (isAdding) {
          // Append to the highest-numbered cached page; if it's full, spin
          // up a new page so the new row is visible somewhere.
          const sorted = [...previousRows].sort(
            (a, b) =>
              (a[1]?.page ?? Number.NEGATIVE_INFINITY) -
              (b[1]?.page ?? Number.NEGATIVE_INFINITY),
          );
          const [lastKey, lastData] = sorted[sorted.length - 1];
          if (lastData) {
            const watchlist = [...lastData.watchlist, filmInfoToRow(filmInfo)];
            const totalItems = lastData.totalItems + 1;
            const totalPages =
              Math.ceil(totalItems / WATCHLIST_PAGE_SIZE) || 1;
            queryClient.setQueryData<WatchlistPageData>(lastKey, {
              ...lastData,
              watchlist,
              totalItems,
              totalPages,
            });
          }
        } else {
          // Remove from every cached page and fix up the totals. A page that
          // becomes empty keeps its slot (the canonical refetch onSettled
          // will reconcile the layout — but we leave it rather than shuffle
          // rows across pages, which would fight the server's source of
          // truth).
          previousRows.forEach(([key, pageData]) => {
            if (!pageData) return;
            const hasRow = pageData.watchlist.some(
              (row) => row.watchListId === filmInfo.id,
            );
            if (!hasRow) return;
            const watchlist = pageData.watchlist.filter(
              (row) => row.watchListId !== filmInfo.id,
            );
            const totalItems = Math.max(pageData.totalItems - 1, 0);
            const totalPages =
              totalItems === 0
                ? 0
                : Math.ceil(totalItems / WATCHLIST_PAGE_SIZE);
            queryClient.setQueryData<WatchlistPageData>(key, {
              ...pageData,
              watchlist,
              totalItems,
              totalPages,
            });
          });
        }
      }

      return { previousIds, previousRows };
    },
    onError: (_err, _filmInfo, context) => {
      if (context?.previousIds) {
        queryClient.setQueryData(
          preferencesKeys.watchlistItems(),
          context.previousIds,
        );
      }
      context?.previousRows.forEach(([key, pageData]) => {
        queryClient.setQueryData(key, pageData);
      });
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
