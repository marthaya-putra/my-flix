import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
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
 *
 * Like↔dislike mutual exclusion is enforced by the SERVER (toggleMoviePreference
 * clears any existing dislike before adding a like). This hook only mirrors
 * that optimistically in the client caches so the UI flips immediately;
 * onSettled reconciles to the server's authoritative state.
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

      // The server is the authority for like↔dislike mutual exclusion: when
      // it adds a like it clears any existing dislike, so the client no longer
      // needs to clear the other cache itself. The client-side clear was
      // gated on a render-time snapshot, but a stale snapshot could let a
      // dislike survive a like (title in both states).
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
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.likedItems(),
      });

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
      toast.error("Couldn't save your like. Reverted.");
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
