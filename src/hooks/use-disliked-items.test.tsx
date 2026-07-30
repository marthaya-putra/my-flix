// src/hooks/use-disliked-items.test.tsx
// Integration test mirroring use-watchlist.test.tsx (ADR 0002 reference
// shape): drive the hook through its public API
// ({ isDisliked, toggleDislike, isToggling }), wire a real QueryClient +
// provider, and mock ONLY the server-fn edge (`@/lib/data/preferences`).
//
// The focus is the like↔dislike mutual-exclusion recipe: disliking a title
// that was never liked must NOT call the throwing preference-removal fn
// (the original bug), while disliking a liked title must clear the like
// first. The server fns are mocked against shared mutable state so the
// read fn mirrors what the toggle actually persisted.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FilmInfo } from "@/lib/types";
import { preferencesKeys } from "@/lib/queries/preferences";
import { useDislikedItems } from "./use-disliked-items";

// Mock only the external edge: the server fns the hook imports.
vi.mock("@/lib/data/preferences", () => ({
  removeUserPreferenceByPreferenceId: vi.fn(),
  toggleDislike: vi.fn(),
}));

// Toast surface is a side effect, not part of the recipe — mock it so we
// can assert it fires without coupling to sonner's internals.
const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

// Imported after the mocks above so the mocked module is what the hook sees.
import {
  removeUserPreferenceByPreferenceId,
  toggleDislike,
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

  it("does not call the preference-removal fn for a never-liked title (regression)", async () => {
    const client = makeClient();
    // Seed caches: nothing disliked, nothing liked.
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [] });

    vi.mocked(removeUserPreferenceByPreferenceId).mockResolvedValue(
      undefined as never,
    );
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

    // The bug: the old isAdding gate called the throwing preference-removal
    // fn for every never-liked title, rejecting the whole mutation. With the
    // liked-status gate it is skipped entirely.
    expect(removeUserPreferenceByPreferenceId).not.toHaveBeenCalled();
    expect(toggleDislike).toHaveBeenCalledTimes(1);
    expect(toastError).not.toHaveBeenCalled();
  });

  it("clears an existing like before adding a dislike", async () => {
    const client = makeClient();
    // Seed caches: nothing disliked, but the title IS liked.
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [FILM.id] });

    const order: string[] = [];
    vi.mocked(removeUserPreferenceByPreferenceId).mockImplementation(
      async () => {
        order.push("clearLike");
        return undefined as never;
      },
    );
    vi.mocked(toggleDislike).mockImplementation(async () => {
      order.push("toggleDislike");
      return { action: "added" } as never;
    });

    const { result } = renderHook(() => useDislikedItems(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isDisliked(42)).toBe(false);
    });

    await act(async () => {
      result.current.toggleDislike(FILM);
    });

    expect(removeUserPreferenceByPreferenceId).toHaveBeenCalledTimes(1);
    expect(toggleDislike).toHaveBeenCalledTimes(1);
    // Clearing the like happens before the dislike toggle.
    expect(order).toEqual(["clearLike", "toggleDislike"]);
  });

  it("rolls back to the previous state when the server rejects", async () => {
    const client = makeClient();
    client.setQueryData(preferencesKeys.dislikedItems(), { dislikedIds: [] });
    client.setQueryData(preferencesKeys.likedItems(), { likedIds: [] });

    vi.mocked(removeUserPreferenceByPreferenceId).mockResolvedValue(
      undefined as never,
    );
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
