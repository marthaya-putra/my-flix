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
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());

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
  const isToggling = (id: number) => togglingIds.has(id);

  const toggleLike = async (filmInfo: FilmInfo) => {
    const { id, title, releaseDate, category, genres } = filmInfo;
    const year = releaseDate ? new Date(releaseDate).getFullYear() : new Date().getFullYear();
    const categoryValue = category === "tv" ? "tv-series" : "movie";

    setTogglingIds((prev) => new Set(prev).add(id));

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

      if (result.success) {
        setState((prev) => {
          const newLikedIds = new Set(prev.likedIds);
          if (newLikedIds.has(id)) {
            newLikedIds.delete(id);
          } else {
            newLikedIds.add(id);
          }
          return { likedIds: newLikedIds, isPending: false };
        });
      }
    } catch {
      // Error - just clear toggling state
    } finally {
      setTogglingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }
  };

  return {
    isLiked,
    isToggling,
    toggleLike,
    isPending: state.isPending,
  };
}
