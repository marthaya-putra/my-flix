import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toggleDislike as toggleDislikeFn } from "@/lib/data/preferences";
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
 * its own toggle. Like↔dislike mutual exclusion is enforced by the SERVER
 * (toggleDislike clears any existing like before adding a dislike). This hook
 * only mirrors that optimistically in the client caches so the UI flips
 * immediately; onSettled reconciles to the server's authoritative state.
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

      // The server is the authority for like↔dislike mutual exclusion: when
      // it adds a dislike it clears any existing like, so the client no longer
      // needs to clear the other cache itself. This was a client-side clear
      // gated on a render-time snapshot, but a stale snapshot let a like
      // survive a dislike (title ended up in BOTH states).
      return toggleDislikeFn({
        data: { preferenceId: id, title, year, category: categoryValue },
      });
    },
    onMutate: async (filmInfo) => {
      // Cancel in-flight reads so they don't clobber the optimistic update.
      await queryClient.cancelQueries({
        queryKey: preferencesKeys.dislikedItems(),
      });

      const previousDisliked = queryClient.getQueryData<{
        dislikedIds: number[];
      }>(preferencesKeys.dislikedItems());

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
      toast.error("Couldn't save your dislike. Reverted.");
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
