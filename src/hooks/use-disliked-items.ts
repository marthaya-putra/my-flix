import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addUserDislikeFn,
  removeUserDislikeByPreferenceIdFn,
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
 * Mirrors `useLikedItems`, but only ever touches the disliked-items cache
 * keys. Like↔dislike mutual exclusion is intentionally NOT handled here —
 * the two caches are decoupled so each hook has a single responsibility;
 * callers that need exclusion (e.g. RecommendationCard) orchestrate it.
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

      return dislikedIds.has(id)
        ? removeUserDislikeByPreferenceIdFn({ data: { preferenceId: id } })
        : addUserDislikeFn({ data: { preferenceId: id, title, year, category: categoryValue } });
    },
    onMutate: async (filmInfo) => {
      // Cancel in-flight reads so they don't clobber the optimistic update.
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.dislikedItems(),
      });

      const previous = queryClient.getQueryData<{ dislikedIds: number[] }>(
        preferencesKeys.dislikedItems(),
      );

      const prevSet = new Set(previous?.dislikedIds ?? []);
      const nextSet = new Set(prevSet);
      if (nextSet.has(filmInfo.id)) {
        nextSet.delete(filmInfo.id);
      } else {
        nextSet.add(filmInfo.id);
      }

      queryClient.setQueryData(preferencesKeys.dislikedItems(), {
        dislikedIds: [...nextSet],
      });

      return { previous };
    },
    onError: (_err, _filmInfo, context) => {
      // Revert on failure.
      if (context?.previous) {
        queryClient.setQueryData(
          preferencesKeys.dislikedItems(),
          context.previous,
        );
      }
    },
    onSettled: () => {
      // Refetch the canonical list and refresh any preferences views.
      void queryClient.invalidateQueries({
        queryKey: preferencesKeys.dislikedItems(),
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
