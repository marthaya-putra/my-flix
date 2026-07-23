import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addUserDislikeFn,
  removeUserDislikeByPreferenceIdFn,
  removeUserPreferenceByPreferenceId,
} from "@/lib/data/preferences";
import {
  dislikedItemsOptions,
  preferencesKeys,
} from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";

/**
 * Read the user's disliked items from the QueryClient cache (populated by
 * the route loaders) and toggle a dislike via `useMutation`.
 *
 * Mirrors `useLikedItems`, but only ever writes the disliked-items cache for
 * its own toggle. Like↔dislike mutual exclusion is owned here: turning a
 * dislike **on** removes an existing like for the same id (optimistically,
 * then via the preference removal server fn). Callers do not orchestrate
 * exclusion — the two caches stay consistent on their own. See ADR
 * `docs/adr/0002-reaction-mutual-exclusion-in-hooks.md`.
 */
export function useDislikedItems() {
  const queryClient = useQueryClient();

  const { data, isPending } = useQuery(dislikedItemsOptions());
  const dislikedIds = new Set(data?.dislikedIds ?? []);

  const toggleMutation = useMutation({
    mutationFn: (filmInfo: FilmInfo) => {
      const { id, title, releaseDate, category } = filmInfo;
      const year = releaseDate
        ? new Date(releaseDate).getFullYear()
        : new Date().getFullYear();
      const categoryValue = category === "tv" ? "tv-series" : "movie";

      const isAdding = !dislikedIds.has(id);

      // Mutual exclusion: turning the dislike on clears any existing like
      // first so the server never holds both. Best-effort — a failure here
      // shouldn't block the dislike itself; the caches are reconciled in
      // onSettled regardless.
      const clearingLike = isAdding
        ? removeUserPreferenceByPreferenceId({
            data: { preferenceId: id },
          }).then(() => undefined)
        : Promise.resolve();

      if (isAdding) {
        return clearingLike.then(() =>
          addUserDislikeFn({
            data: { preferenceId: id, title, year, category: categoryValue },
          }),
        );
      }
      return clearingLike.then(() =>
        removeUserDislikeByPreferenceIdFn({ data: { preferenceId: id } }),
      );
    },
    onMutate: async (filmInfo) => {
      // Cancel in-flight reads so they don't clobber the optimistic update.
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.dislikedItems(),
      });

      const previousDisliked = queryClient.getQueryData<{ dislikedIds: number[] }>(
        preferencesKeys.dislikedItems(),
      );

      const prevSet = new Set(previousDisliked?.dislikedIds ?? []);
      const nextSet = new Set(prevSet);
      const isAdding = !nextSet.has(filmInfo.id);
      if (isAdding) {
        nextSet.add(filmInfo.id);
      } else {
        nextSet.delete(filmInfo.id);
      }

      queryClient.setQueryData(preferencesKeys.dislikedItems(), {
        dislikedIds: [...nextSet],
      });

      // Mutual exclusion: when adding a dislike, optimistically remove the id
      // from the liked-items cache so the UI flips immediately.
      let previousLiked: { likedIds: number[] } | undefined;
      if (isAdding) {
        previousLiked = queryClient.getQueryData<{ likedIds: number[] }>(
          preferencesKeys.likedItems(),
        );
        if (previousLiked?.likedIds.includes(filmInfo.id)) {
          queryClient.setQueryData(preferencesKeys.likedItems(), {
            likedIds: previousLiked.likedIds.filter(
              (lId) => lId !== filmInfo.id,
            ),
          });
        }
      }

      return { previousDisliked, previousLiked };
    },
    onError: (_err, _filmInfo, context) => {
      // Revert on failure.
      if (context?.previousDisliked) {
        queryClient.setQueryData(
          preferencesKeys.dislikedItems(),
          context.previousDisliked,
        );
      }
      if (context?.previousLiked) {
        queryClient.setQueryData(
          preferencesKeys.likedItems(),
          context.previousLiked,
        );
      }
    },
    onSettled: () => {
      // Refetch the canonical lists and refresh any preferences views.
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.dislikedItems(),
      });
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.likedItems(),
      });
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.userPreferences(),
      });
    },
  });

  const isDisliked = (id: number) => dislikedIds.has(id);
  const toggleDislike = (filmInfo: FilmInfo) => {
    void toggleMutation.mutate(filmInfo);
  };

  return {
    isDisliked,
    toggleDislike,
    // True while the initial disliked-items read is loading.
    isPending,
    // True while a toggle is in flight.
    isToggling: toggleMutation.isPending,
  };
}
