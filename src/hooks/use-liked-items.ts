import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  removeUserDislikeByPreferenceIdFn,
  toggleMoviePreference,
} from "@/lib/data/preferences";
import { likedItemsOptions, preferencesKeys } from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";

/**
 * Read the user's liked items from the QueryClient cache (populated by
 * the root layout / loaders) and toggle a like via `useMutation`.
 *
 * The mutation applies an optimistic update to the liked-items cache,
 * and on success invalidates both the liked-items and the user-preferences
 * keys so every read path reflects the new state.
 *
 * Like↔dislike mutual exclusion is owned here: turning a like **on** removes
 * an existing dislike for the same id (optimistically, then via the dislike
 * removal server fn). Callers do not orchestrate exclusion — the two caches
 * stay consistent on their own. See ADR
 * `docs/adr/0002-reaction-mutual-exclusion-in-hooks.md`.
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

      // Turning the like on: clear any existing dislike first so the server
      // never holds both. Best-effort — a failure here shouldn't block the
      // like itself; the caches are reconciled in onSettled regardless.
      const clearingDislike = likedIds.has(id)
        ? Promise.resolve()
        : removeUserDislikeByPreferenceIdFn({
            data: { preferenceId: id },
          }).then(() => undefined);

      return clearingDislike.then(() =>
        toggleMoviePreference({
          data: {
            preferenceId: id,
            title,
            year,
            category: categoryValue,
            genres,
            posterPath: filmInfo.posterPath,
          },
        }),
      );
    },
    onMutate: async (filmInfo) => {
      // Cancel in-flight reads so they don't clobber the optimistic update.
      await queryClient.cancelQueries({ queryKey: preferencesKeys.likedItems() });

      const previousLiked = queryClient.getQueryData<{ likedIds: number[] }>(
        preferencesKeys.likedItems(),
      );

      const prevSet = new Set(previousLiked?.likedIds ?? []);
      const nextSet = new Set(prevSet);
      const isAdding = !nextSet.has(filmInfo.id);
      if (isAdding) {
        nextSet.add(filmInfo.id);
      } else {
        nextSet.delete(filmInfo.id);
      }

      queryClient.setQueryData(preferencesKeys.likedItems(), {
        likedIds: [...nextSet],
      });

      // Mutual exclusion: when adding a like, optimistically remove the id
      // from the disliked-items cache so the UI flips immediately.
      let previousDisliked: { dislikedIds: number[] } | undefined;
      if (isAdding) {
        previousDisliked = queryClient.getQueryData<{ dislikedIds: number[] }>(
          preferencesKeys.dislikedItems(),
        );
        if (previousDisliked?.dislikedIds.includes(filmInfo.id)) {
          queryClient.setQueryData(preferencesKeys.dislikedItems(), {
            dislikedIds: previousDisliked.dislikedIds.filter(
              (dId) => dId !== filmInfo.id,
            ),
          });
        }
      }

      return { previousLiked, previousDisliked };
    },
    onError: (_err, _filmInfo, context) => {
      // Revert on failure.
      if (context?.previousLiked) {
        queryClient.setQueryData(
          preferencesKeys.likedItems(),
          context.previousLiked,
        );
      }
      if (context?.previousDisliked) {
        queryClient.setQueryData(
          preferencesKeys.dislikedItems(),
          context.previousDisliked,
        );
      }
    },
    onSettled: () => {
      // Refetch the canonical lists and refresh any preferences views.
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.likedItems(),
      });
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.dislikedItems(),
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
