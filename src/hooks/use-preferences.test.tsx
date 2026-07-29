// src/hooks/use-preferences.test.tsx
// ADR 0002 — integration test. Drives the hook through its public API (the
// returned { preferences, addPreference, removePreference, isSaving }), wires
// a real QueryClient + provider, and mocks ONLY the server-fn edge
// (`@/lib/data/preferences`). Nothing internal is called directly.
//
// What this guards: Issue #80 / CODING_STANDARDS.md §8 — the preferences
// profile must flow through the Query cache as the single source of truth,
// not a parallel useState mirror. So the assertions are about the cache
// reconciling after a mutation, not about local state copies.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilmInfo, Person } from "@/lib/types";
import type { UserPreferences } from "@/lib/types/preferences";
import { usePreferences } from "./use-preferences";

// Mock only the external edge: the server fns the hook calls. The Query
// options factory's own read (fetchUserPreferences) is also a server fn, so
// it is mocked here too — everything else (QueryClient, key factory,
// invalidation) runs for real.
vi.mock("@/lib/data/preferences", () => ({
  fetchUserPreferences: vi.fn(),
  addMoviePreference: vi.fn(),
  addPersonPreference: vi.fn(),
  removeMoviePreference: vi.fn(),
  removePersonPreference: vi.fn(),
}));

// Toast surface is a side effect, not part of the cache recipe — mock it so we
// can assert it fires without coupling to sonner's internals.
const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({ toast: { error: toastError } }));

import {
  addMoviePreference,
  addPersonPreference,
  fetchUserPreferences,
  removeMoviePreference,
  removePersonPreference,
} from "@/lib/data/preferences";

const FILM: FilmInfo = {
  id: 42,
  posterPath: "/x.jpg",
  backdropPath: "/y.jpg",
  title: "Test Title",
  overview: "",
  voteAverage: 7.5,
  releaseDate: "2024-01-01",
  category: "movie",
  genreIds: [1],
  genres: ["Drama"],
};

const PERSON: Person = {
  id: 7,
  name: "Some Actor",
  profileImageUrl: "/p.jpg",
  popularity: 3,
  category: "actor",
};

const EMPTY: UserPreferences = {
  movies: [],
  tvShows: [],
  people: [],
  favoriteGenres: [],
  minRating: 6,
  preferredContent: { movie: true, tv: true },
  notes: "",
};

function makeClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("usePreferences — integration via its public API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reads the profile from the cache (single source of truth)", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      movies: [{ ...FILM, dbId: 1 }],
    };
    vi.mocked(fetchUserPreferences).mockResolvedValue(
      structuredClone(serverState),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });
    expect(result.current.preferences.movies[0].title).toBe("Test Title");
    expect(fetchUserPreferences).toHaveBeenCalledTimes(1);
  });

  it("adds a movie through the server fn, then the cache reconciles to it", async () => {
    // The read returns the growing server state, so the post-invalidation
    // refetch observes what actually persisted.
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    vi.mocked(addMoviePreference).mockImplementation(async () => {
      serverState.movies.push({ ...FILM, dbId: 1 });
      return {} as never;
    });

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    await act(async () => {
      await result.current.addPreference(FILM);
    });

    expect(addMoviePreference).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });
  });

  it("adds a person through the person server fn", async () => {
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    vi.mocked(addPersonPreference).mockImplementation(async () => {
      serverState.people.push({ ...PERSON, dbId: 9 });
      return {} as never;
    });

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(0);
    });

    await act(async () => {
      await result.current.addPreference(PERSON);
    });

    expect(addPersonPreference).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(1);
    });
  });

  it("removes an entry by its TMDB id and the cache reconciles", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      movies: [{ ...FILM, dbId: 1 }],
    };
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    vi.mocked(removeMoviePreference).mockImplementation(async () => {
      serverState.movies = [];
      return {} as never;
    });

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removePreference(FILM.id, "movie");
    });

    expect(removeMoviePreference).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });
  });

  it("surfaces a failed add via toast and keeps the cache truthful", async () => {
    vi.mocked(fetchUserPreferences).mockResolvedValue(structuredClone(EMPTY));
    vi.mocked(addMoviePreference).mockRejectedValue(new Error("server down"));

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    // addPreference rejects on failure (mutateAsync) — await and swallow so the
    // rejection doesn't surface as an unhandled error in the test harness.
    await act(async () => {
      await result.current.addPreference(FILM).catch(() => undefined);
    });

    // Nothing was added — the cache reflects canonical (empty) state.
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });
    expect(toastError).toHaveBeenCalled();
  });

  it("removes a person by resolving the dbId from the cached profile", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      people: [{ ...PERSON, dbId: 9 }],
    };
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let removedWith: { id: number; personType: string } | undefined;
    vi.mocked(removePersonPreference).mockImplementation(async (arg) => {
      removedWith = (arg as { data: { id: number; personType: string } }).data;
      serverState.people = [];
      return {} as never;
    });

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removePreference(PERSON.id, "person");
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(0);
    });
    // The hook resolved the database id from the cached profile before calling
    // the remove fn — the server only knows db ids.
    expect(removedWith?.id).toBe(9);
    expect(removePersonPreference).toHaveBeenCalledTimes(1);
  });
});
