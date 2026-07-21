import { queryOptions } from "@tanstack/react-query";
import {
  fetchUserPreferences,
  getUserLikedItems,
  getUserDislikedItems,
  getUserWatchlistItems,
  fetchUserWatchlist,
} from "@/lib/data/preferences";
import type { UserPreferences } from "@/lib/types/preferences";
import type { UserWatchlist } from "@/lib/db";

/**
 * Query-key factories + `queryOptions` for user preferences / liked items /
 * disliked items / watchlist.
 *
 * Mutations (toggle like, add/remove preference/dislike, toggle watchlist)
 * invalidate the relevant keys here so every read path reflects the new
 * state without a reload.
 */
export const preferencesKeys = {
  all: ["preferences"] as const,
  userPreferences: () => [...preferencesKeys.all, "user-preferences"] as const,
  likedItems: () => [...preferencesKeys.all, "liked-items"] as const,
  dislikedItems: () => [...preferencesKeys.all, "disliked-items"] as const,
  watchlistItems: () => [...preferencesKeys.all, "watchlist-items"] as const,
  // Bare prefix for the full-rows list read by /watchlist. Each page appends
  // its page number to this prefix in `userWatchlistOptions`, so the cache
  // holds one entry per page and `invalidateQueries(userWatchlist())`
  // refetches them all after a toggle.
  userWatchlist: () => [...preferencesKeys.all, "user-watchlist"] as const,
};

export const userPreferencesOptions = () =>
  queryOptions<UserPreferences>({
    queryKey: preferencesKeys.userPreferences(),
    queryFn: () => fetchUserPreferences(),
  });

export const likedItemsOptions = () =>
  queryOptions<{ likedIds: number[] }>({
    queryKey: preferencesKeys.likedItems(),
    queryFn: () => getUserLikedItems(),
  });

export const dislikedItemsOptions = () =>
  queryOptions<{ dislikedIds: number[] }>({
    queryKey: preferencesKeys.dislikedItems(),
    queryFn: () => getUserDislikedItems(),
  });

export const watchlistItemsOptions = () =>
  queryOptions<{ watchlistIds: number[] }>({
    queryKey: preferencesKeys.watchlistItems(),
    queryFn: () => getUserWatchlistItems(),
  });

export const userWatchlistOptions = (page: number = 1) =>
  queryOptions<{
    watchlist: UserWatchlist[];
    page: number;
    totalPages: number;
    totalItems: number;
  }>({
    queryKey: [...preferencesKeys.userWatchlist(), page],
    queryFn: () => fetchUserWatchlist({ data: page }),
  });

