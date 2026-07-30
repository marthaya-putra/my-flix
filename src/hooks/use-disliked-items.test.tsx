// src/hooks/use-disliked-items.test.tsx
// Integration test mirroring use-watchlist.test.tsx (ADR 0002 reference
// shape): drive the hook through its public API
// ({ isDisliked, toggleDislike, isToggling }), wire a real QueryClient +
// provider, and mock ONLY the server-fn edge (`@/lib/data/preferences`).
//
// Like↔dislike mutual exclusion is now enforced by the SERVER (toggleDislike
// clears any existing like before adding a dislike), so this hook's job is
// just the optimistic-toggle + rollback recipe: flip its own cache, mirror
// the exclusion into the liked cache so the UI flips immediately, and
// reconcile via onSettled. The mock only stands in for the server fn.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { preferencesKeys } from "@/lib/queries/preferences";
import type { FilmInfo } from "@/lib/types";
import { useDislikedItems } from "./use-disliked-items";

// Mock only the external edge: the server fn the hook imports.
vi.mock("@/lib/data/preferences", () => ({
  toggleDislike: vi.fn(),
}));

// Toast surface is a side effect, not part of the recipe — mock it so we
// can assert it fires without coupling to sonner's internals.
const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

// Imported after the mocks above so the mocked module is what the hook sees.
import { toggleDislike } from "@/lib/data/preferences";

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

function makeClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false }, // no retry noise when we reject to test rollback
    },
  });
}

function wrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}

describe("useDislikedItems — integration via its public API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("optimistically flips the dislike on, then confirms with the server", async () => {
    const client = makeClient();
    // Seed caches: nothing disliked, nothing liked.
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [] });

    vi.mocked(toggleDislike).mockResolvedValue({ action: "added" } as never);

    const { result } = renderHook(() => useDislikedItems(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(false);
    });

    await act(async () => {
      result.current.toggleDislike(FILM);
    });

    // Single toggle call — the server owns mutual exclusion now.
    expect(toggleDislike).toHaveBeenCalledTimes(1);
    expect(toggleDislike).toHaveBeenCalledWith({
      data: {
        preferenceId: 42,
        title: "Test Title",
        year: 2024,
        category: "movie",
      },
    });
    // State holds after the server confirms.
    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(true);
    });
  });

  it("mirrors exclusion into the liked cache so the UI flips immediately", async () => {
    const client = makeClient();
    // Seed caches: nothing disliked, but the title IS liked.
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [FILM.id] });

    vi.mocked(toggleDislike).mockResolvedValue({ action: "added" } as never);

    const { result } = renderHook(() => useDislikedItems(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(false);
    });

    await act(async () => {
      result.current.toggleDislike(FILM);
    });

    // The hook optimistically strips the like from the liked cache (the server
    // is the authority, but the UI shouldn't wait for the round-trip).
    await waitFor(() => {
      expect(
        client.getQueryData<{ likedIds: number[] }>(
          preferencesKeys.likedItems(),
        )?.likedIds,
      ).not.toContain(FILM.id);
    });
    expect(result.current.isDisliked(42)).toBe(true);
  });

  it("rolls back to the previous state when the server rejects", async () => {
    const client = makeClient();
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [] });

    let rejectMutation!: (e: unknown) => void;
    vi.mocked(toggleDislike).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectMutation = reject;
        }),
    );

    const { result } = renderHook(() => useDislikedItems(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(false);
    });

    await act(async () => {
      result.current.toggleDislike(FILM);
    });

    // Optimistic state visible while the mutation is pending.
    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(true);
    });

    // Reject — onMutate's snapshot should be restored by onError.
    await act(async () => {
      rejectMutation(new Error("server down"));
    });

    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(false);
    });

    expect(toastError).toHaveBeenCalledWith(
      "Couldn't save your dislike. Reverted.",
    );
  });
});
