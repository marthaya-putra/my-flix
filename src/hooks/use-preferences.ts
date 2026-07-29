import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  addMoviePreference,
  addPersonPreference,
  removeMoviePreference,
  removePersonPreference,
} from "@/lib/data/preferences";
import {
  preferencesKeys,
  userPreferencesOptions,
} from "@/lib/queries/preferences";
import type { FilmInfo, Person } from "@/lib/types";
import type { UserPreferences } from "@/lib/types/preferences";

/**
 * Read the user's full preferences profile from the QueryClient cache
 * (primed by the /preferences layout route's loader) and add/remove entries
 * via `useMutation`.
 *
 * Issue #80 / CODING_STANDARDS.md §8: TanStack Query is the single source of
 * truth for this domain. The previous hook held a parallel `useState` copy of
 * `UserPreferences` that could drift from the canonical read that
 * /recommendations uses via `getAllUserContent`. This hook reads from the
 * cache and writes through mutations that invalidate `userPreferences` so the
 * cache — one store — refreshes. No local `useState` mirror.
 *
 * Mutations throw on failure (server fns throw per Issue #78); `onError`
 * surfaces the failure to the UI with a toast and `onSettled` invalidates so
 * the cache refetches canonical state regardless of success or failure.
 */

// Discriminated input for the add mutation: a film (movie/tv) or a person.
// Mirrors the union the consumers pass (FilmInfo | Person) and routes each to
// its own server fn with the right shape.
type AddPreferenceInput =
  | { kind: "film"; content: FilmInfo }
  | { kind: "person"; content: Person };

type RemovePreferenceInput = {
  id: number;
  type: "movie" | "tv" | "person";
};

// Empty profile the cache holds before the first read resolves. Matches the
// shape `fetchUserPreferences` returns for an unauthenticated user.
const EMPTY_PREFERENCES: UserPreferences = {
  movies: [],
  tvShows: [],
  people: [],
  favoriteGenres: [],
  minRating: 6,
  preferredContent: { movie: true, tv: true },
  notes: "",
};

// Toast strings mirror the sibling optimistic hooks' cadence
// ("Couldn't … Reverted.") — the raw server message is never shown to the user.
const ADD_ERROR = "Couldn't save your preference. Reverted.";
const REMOVE_ERROR = "Couldn't remove your preference. Reverted.";

export function usePreferences() {
  const queryClient = useQueryClient();

  const { data } = useQuery(userPreferencesOptions());
  const preferences = data ?? EMPTY_PREFERENCES;

  // After any preference mutation, invalidate the cached user-preferences and
  // liked-items queries so read paths (preferences UI, navbar, /recommendations)
  // refetch the canonical server state. Liked-items is coupled: an added
  // preference is also a liked id, so it must refresh in lockstep. Lives in
  // onSettled so a failed mutation still reconciles the cache to truth.
  const invalidatePreferenceQueries = () => {
    void queryClient.invalidateQueries({
      queryKey: preferencesKeys.userPreferences(),
    });
    void queryClient.invalidateQueries({
      queryKey: preferencesKeys.likedItems(),
    });
  };

  const addMutation = useMutation({
    mutationFn: async (input: AddPreferenceInput) => {
      if (input.kind === "person") {
        const person = input.content;
        await addPersonPreference({
          data: {
            personId: person.id,
            personName: person.name,
            personType: person.category,
            profilePath: person.profileImageUrl,
          },
        });
        return;
      }

      const film = input.content;
      const category = film.category === "tv" ? "tv-series" : "movie";
      await addMoviePreference({
        data: {
          preferenceId: film.id,
          title: film.title,
          year: Number.parseInt(film.releaseDate.split("-")[0]) || 0,
          category,
          genres: film.genres.join(", ") || undefined,
          posterPath: film.posterPath,
        },
      });
    },
    onError: () => toast.error(ADD_ERROR),
    onSettled: () => invalidatePreferenceQueries(),
  });

  const removeMutation = useMutation({
    mutationFn: async (input: RemovePreferenceInput) => {
      if (input.type === "person") {
        const person = preferences.people.find((p) => p.id === input.id);
        const dbId = person?.dbId;
        await removePersonPreference({
          data: {
            id: dbId ?? input.id,
            personType: person?.category ?? "actor",
          },
        });
        return;
      }

      const list =
        input.type === "movie" ? preferences.movies : preferences.tvShows;
      const found = list.find((item) => item.id === input.id);
      const dbId = found?.dbId;
      await removeMoviePreference({
        data: {
          id: dbId ?? input.id,
          type: input.type === "movie" ? "movie" : "tv-series",
        },
      });
    },
    onError: () => toast.error(REMOVE_ERROR),
    onSettled: () => invalidatePreferenceQueries(),
  });

  // mutateAsync so callers can await completion — the onboarding wizard awaits
  // each add in a loop before navigating to /recommendations, so a fire-and-
  // forget mutate would navigate away mid-save. On rejection the promise
  // rejects after onError fires the toast; the wizard's try/catch then shows
  // its own error and the cache is reconciled by onSettled.
  const addPreference = (content: FilmInfo | Person) => {
    // Discriminate by a required field: FilmInfo always has `title`, Person
    // never does. Checking the optional `knownFor` alone (the old approach)
    // misroutes a Person that omits it as a film. `title` is required on the
    // type, so its presence is a reliable film signal.
    const isFilm = "title" in content;
    return addMutation.mutateAsync(
      isFilm
        ? { kind: "film", content: content as FilmInfo }
        : { kind: "person", content: content as Person },
    );
  };

  const removePreference = (id: number, type: "movie" | "tv" | "person") => {
    return removeMutation.mutateAsync({ id, type });
  };

  // True while any add/remove mutation is in flight. Consumers use this to
  // disable affordances during a save; per-item tracking isn't needed once the
  // single cache drives the UI.
  const isSaving = addMutation.isPending || removeMutation.isPending;

  return {
    preferences,
    isSaving,
    addPreference,
    removePreference,
  };
}
