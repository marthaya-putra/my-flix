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

  it("optimistically adds a movie before the server resolves, then confirms", async () => {
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    // Hold the mutation so we can observe the optimistic window before the
    // server settles.
    let resolveAdd!: () => void;
    vi.mocked(addMoviePreference).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAdd = () => {
            serverState.movies.push({ ...FILM, dbId: 1 });
            resolve({} as never);
          };
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    // Kick off the add; don't await — we want to read mid-flight.
    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.addPreference(FILM);
    });

    // Optimistic write: the movie is visible before the server resolves. dbId
    // is absent until the refetch back-fills it (the type marks it optional).
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });
    expect(result.current.preferences.movies[0].id).toBe(FILM.id);
    expect(result.current.preferences.movies[0].dbId).toBeUndefined();

    // Let the server persist + the hook's onSettled invalidation refetch.
    await act(async () => {
      resolveAdd();
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });
    expect(addMoviePreference).toHaveBeenCalledTimes(1);
  });

  it("rolls back an optimistic add when the server rejects", async () => {
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let rejectAdd!: (e: unknown) => void;
    vi.mocked(addMoviePreference).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectAdd = reject;
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.addPreference(FILM);
    });

    // Optimistic write visible while the mutation is pending.
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });

    // Reject — onError should restore the snapshotted (empty) cache.
    await act(async () => {
      rejectAdd(new Error("server down"));
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });
    expect(toastError).toHaveBeenCalledWith(
      "Couldn't save your preference. Reverted.",
    );
  });

  it("optimistically removes a movie before the server resolves, then confirms", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      movies: [{ ...FILM, dbId: 1 }],
    };
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let resolveRemove!: () => void;
    vi.mocked(removeMoviePreference).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemove = () => {
            serverState.movies = [];
            resolve({} as never);
          };
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.removePreference(FILM.id, "movie");
    });

    // Optimistic removal: the item is gone before the server resolves.
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    await act(async () => {
      resolveRemove();
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });
    expect(removeMoviePreference).toHaveBeenCalledTimes(1);
  });

  it("rolls back an optimistic remove when the server rejects", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      movies: [{ ...FILM, dbId: 1 }],
    };
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let rejectRemove!: (e: unknown) => void;
    vi.mocked(removeMoviePreference).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectRemove = reject;
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.removePreference(FILM.id, "movie");
    });

    // Optimistic removal visible while pending.
    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(0);
    });

    // Reject — onError restores the snapshotted (1-item) cache.
    await act(async () => {
      rejectRemove(new Error("server down"));
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.movies).toHaveLength(1);
    });
    expect(toastError).toHaveBeenCalledWith(
      "Couldn't remove your preference. Reverted.",
    );
  });

  it("optimistically adds a tv show (category tv) before the server resolves", async () => {
    const TV: FilmInfo = { ...FILM, id: 88, category: "tv" };
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let resolveAdd!: () => void;
    vi.mocked(addMoviePreference).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAdd = () => {
            serverState.tvShows.push({ ...TV, dbId: 2 });
            resolve({} as never);
          };
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.tvShows).toHaveLength(0);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.addPreference(TV);
    });

    // Routes to tvShows (category tv), not movies.
    await waitFor(() => {
      expect(result.current.preferences.tvShows).toHaveLength(1);
    });
    expect(result.current.preferences.movies).toHaveLength(0);

    await act(async () => {
      resolveAdd();
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.tvShows).toHaveLength(1);
    });
  });

  it("optimistically adds a person (kind person) before the server resolves", async () => {
    const serverState: UserPreferences = structuredClone(EMPTY);
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let resolveAdd!: () => void;
    vi.mocked(addPersonPreference).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveAdd = () => {
            serverState.people.push({ ...PERSON, dbId: 9 });
            resolve({} as never);
          };
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(0);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.addPreference(PERSON);
    });

    // Routes to people via the kind:person branch, not movies/tvShows.
    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(1);
    });
    expect(result.current.preferences.movies).toHaveLength(0);

    await act(async () => {
      resolveAdd();
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(1);
    });
  });

  it("optimistically removes a person before the server resolves", async () => {
    const serverState: UserPreferences = {
      ...EMPTY,
      people: [{ ...PERSON, dbId: 9 }],
    };
    vi.mocked(fetchUserPreferences).mockImplementation(async () =>
      structuredClone(serverState),
    );
    let resolveRemove!: () => void;
    vi.mocked(removePersonPreference).mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveRemove = () => {
            serverState.people = [];
            resolve({} as never);
          };
        }),
    );

    const client = makeClient();
    const { result } = renderHook(() => usePreferences(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(1);
    });

    let pending!: Promise<unknown>;
    act(() => {
      pending = result.current.removePreference(PERSON.id, "person");
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(0);
    });

    await act(async () => {
      resolveRemove();
      await pending.catch(() => undefined);
    });

    await waitFor(() => {
      expect(result.current.preferences.people).toHaveLength(0);
    });
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
