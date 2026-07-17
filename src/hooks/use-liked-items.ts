import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toggleMoviePreference } from "@/lib/data/preferences";
import { likedItemsOptions, preferencesKeys } from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";

/**
 * Read the user's liked items from the QueryClient cache (populated by
 * the root layout / loaders) and toggle a like via `useMutation`.
 *
 * The mutation applies an optimistic update to the liked-items cache,
 * and on success invalidates both the liked-items and the user-preferences
 * keys so every read path reflects the new state.
 */
export function useLikedItems() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery(likedItemsOptions());
  const likedIds = new Set(data?.likedIds ?? []);

  const toggleMutation = useMutation({
    mutationFn: (filmInfo: FilmInfo) => {
      const { id, title, releaseDate, category, genres } = filmInfo;
      const year = releaseDate
        ? new Date(releaseDate).getFullYear()
        : new Date().getFullYear();
      const categoryValue = category === "tv" ? "tv-series" : "movie";

      return toggleMoviePreference({
        data: {
          preferenceId: id,
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
      await queryClient.cancelQueries({ queryKey: preferencesKeys.likedItems() });

      const previous = queryClient.getQueryData<{ likedIds: number[] }>(
        preferencesKeys.likedItems(),
      );

      const prevSet = new Set(previous?.likedIds ?? []);
      const nextSet = new Set(prevSet);
      if (nextSet.has(filmInfo.id)) {
        nextSet.delete(filmInfo.id);
      } else {
        nextSet.add(filmInfo.id);
      }

      queryClient.setQueryData(preferencesKeys.likedItems(), {
        likedIds: [...nextSet],
      });

      return { previous };
    },
    onError: (_err, _filmInfo, context) => {
      // Revert on failure.
      if (context?.previous) {
        queryClient.setQueryData(
          preferencesKeys.likedItems(),
          context.previous,
        );
      }
    },
    onSettled: () => {
      // Refetch the canonical list and refresh any preferences views.
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.likedItems(),
      });
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.userPreferences(),
      });
    },
  });

  const isLiked = (id: number) => likedIds.has(id);
  const toggleLike = (filmInfo: FilmInfo) => {
    void toggleMutation.mutate(filmInfo);
  };

  return {
    isLiked,
    toggleLike,
    // True while the initial liked-items read is loading.
    isPending,
    // True while a toggle is in flight. Exposed so callers can show a
    // per-item "liking…" affordance if they want.
    isToggling: toggleMutation.isPending,
  };
}
