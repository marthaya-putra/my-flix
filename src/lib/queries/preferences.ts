import { queryOptions } from "@tanstack/react-query";
import {
  fetchUserPreferences,
  getUserLikedItems,
  getUserDislikedItems,
} from "@/lib/data/preferences";
import type { UserPreferences } from "@/lib/types/preferences";

/**
 * Query-key factories + `queryOptions` for user preferences / liked items /
 * disliked items.
 *
 * Mutations (toggle like, add/remove preference/dislike) invalidate the
 * relevant keys here so every read path reflects the new state without a
 * reload.
 */
export const preferencesKeys = {
  all: ["preferences"] as const,
  userPreferences: () => [...preferencesKeys.all, "user-preferences"] as const,
  likedItems: () => [...preferencesKeys.all, "liked-items"] as const,
  dislikedItems: () => [...preferencesKeys.all, "disliked-items"] as const,
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
