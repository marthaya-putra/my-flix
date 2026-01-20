import { useEffect, useState } from "react";
import { getUserLikedItems, toggleMoviePreference } from "@/lib/data/preferences";
import type { FilmInfo } from "@/lib/types";

export interface LikedItemsState {
  likedIds: Set<number>;
  isPending: boolean;
}

export function useLikedItems() {
  const [state, setState] = useState<LikedItemsState>({
    likedIds: new Set<number>(),
    isPending: true,
  });

  useEffect(() => {
    let mounted = true;

    async function fetchLikedItems() {
      try {
        const result = await getUserLikedItems();
        if (mounted) {
          setState({
            likedIds: new Set(result.likedIds),
            isPending: false,
          });
        }
      } catch {
        if (mounted) {
          setState({
            likedIds: new Set<number>(),
            isPending: false,
          });
        }
      }
    }

    fetchLikedItems();

    return () => {
      mounted = false;
    };
  }, []);

  const isLiked = (id: number) => state.likedIds.has(id);

  const toggleLike = async (filmInfo: FilmInfo) => {
    const { id, title, releaseDate, category, genres } = filmInfo;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
    const categoryValue = category === "tv" ? "tv-series" : "movie";

    const currentlyLiked = state.likedIds.has(id);

    // Optimistically update UI immediately
    setState((prev) => {
      const newLikedIds = new Set(prev.likedIds);
      if (newLikedIds.has(id)) {
        newLikedIds.delete(id);
      } else {
        newLikedIds.add(id);
      }
      return { likedIds: newLikedIds, isPending: false };
    });

    try {
      const result = await toggleMoviePreference({
        data: {
          preferenceId: id,
          title,
          year,
          category: categoryValue,
          genres,
          posterPath: filmInfo.posterPath,
        },
      });

      // If server failed, revert optimistic update
      if (!result.success) {
        setState((prev) => {
          const newLikedIds = new Set(prev.likedIds);
          if (currentlyLiked) {
            newLikedIds.add(id);
          } else {
            newLikedIds.delete(id);
          }
          return { likedIds: newLikedIds, isPending: false };
        });
      }
    } catch {
      // On error, revert the optimistic update
      setState((prev) => {
        const newLikedIds = new Set(prev.likedIds);
        if (currentlyLiked) {
          newLikedIds.add(id);
        } else {
          newLikedIds.delete(id);
        }
        return { likedIds: newLikedIds, isPending: false };
      });
    }
  };

  return {
    isLiked,
    toggleLike,
    isPending: state.isPending,
  };
}
