// src/hooks/use-watchlist.test.tsx
// ADR 0002 — reference integration test. Drives the hook through its public
// API (the returned { isWatchlisted, toggleWatchlist, isToggling }), wires
// a real QueryClient + provider, and mocks ONLY the server-fn edge
// (`@/lib/data/preferences`). Nothing internal is called directly.
//
// This is the shape every Vitest test in this repo should match:
//   - integration, not isolation;
//   - assert on observable behaviour through the API, not call counts;
//   - the unit under test is the complex logic worth covering — here, the
//     optimistic-toggle + rollback + invalidation recipe.
//
// The two server fns are mocked against a shared `serverState` array so the
// mock mirrors how the real server behaves: a successful toggle persists, so
// the next read sees the new state; a rejected toggle changes nothing, so the
// next read sees the prior state. That keeps the refetch triggered by the
// hook's `onSettled` invalidation consistent with what actually happened.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useWatchlist } from "./use-watchlist";
import type { FilmInfo } from "@/lib/types";

// Mock only the external edge: the server fns. Everything inside the hook
// (QueryClient manipulation, key factory, optimistic recipe) runs for real.
vi.mock("@/lib/data/preferences", () => ({
  getUserWatchlistItems: vi.fn(),
  toggleWatchlistItem: vi.fn(),
}));

// Toast surface is a side effect, not part of the optimistic-toggle recipe —
// mock it so we can assert it fires without coupling to sonner's internals.
const toastError = vi.hoisted(() => vi.fn());
vi.mock("sonner", () => ({
  toast: { error: toastError },
}));

// Imported after the mock above so the mocked module is what the hook sees.
import {
  getUserWatchlistItems,
  toggleWatchlistItem,
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

/**
 * Wire the two server fns against a shared mutable `serverState`. The read
 * fn returns a copy of current state; the toggle fn appends on resolve.
 * Per-tests override `toggleWatchlistItem` when they need rejection or a
 * pending promise they control.
 */
function wireServerState(initial: number[]) {
  const serverState = [...initial];
  vi.mocked(getUserWatchlistItems).mockImplementation(async () => ({
    watchlistIds: [...serverState],
  }));
  vi.mocked(toggleWatchlistItem).mockImplementation(async () => {
    if (!serverState.includes(FILM.id)) serverState.push(FILM.id);
    return { ok: true } as never;
  });
  return {
    serverState,
    /** Hand control of the mutation to the test so it can observe the
     *  optimistic window before the server resolves. */
    holdMutation() {
      let settle!: () => void;
      const pending = new Promise<void>((resolve) => {
        settle = resolve;
      });
      vi.mocked(toggleWatchlistItem).mockImplementation(() => pending as never);
      return {
        resolve() {
          if (!serverState.includes(FILM.id)) serverState.push(FILM.id);
          settle();
        },
      };
    },
  };
}

describe("useWatchlist — integration via its public API", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reflects the server's read in isWatchlisted", async () => {
    wireServerState([42]);
    const client = makeClient();

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(true);
    });
    expect(result.current.isWatchlisted(7)).toBe(false);
    expect(toggleWatchlistItem).not.toHaveBeenCalled();
  });

  it("optimistically adds an id on toggle, then confirms with the server", async () => {
    const server = wireServerState([]);
    const client = makeClient();

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: wrapper(client),
    });

    // Wait for the initial read to settle before toggling.
    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(false);
    });

    // Hold the mutation so we can observe the optimistic window.
    const mutation = server.holdMutation();
    await act(async () => {
      result.current.toggleWatchlist(FILM);
    });

    // Optimistic flip is visible before the server resolves.
    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(true);
    });

    // Now let the server persist + the hook's onSettled invalidation refetch.
    await act(async () => {
      mutation.resolve();
    });

    expect(toggleWatchlistItem).toHaveBeenCalledTimes(1);
    // State holds after the server confirms.
    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(true);
    });
  });

  it("rolls back to the previous state when the server rejects", async () => {
    wireServerState([]);
    const client = makeClient();

    // Rejecting toggle — server state stays unchanged.
    let rejectMutation!: (e: unknown) => void;
    vi.mocked(toggleWatchlistItem).mockImplementation(
      () =>
        new Promise((_resolve, reject) => {
          rejectMutation = reject;
        }),
    );

    const { result } = renderHook(() => useWatchlist(), {
      wrapper: wrapper(client),
    });

    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(false);
    });

    await act(async () => {
      result.current.toggleWatchlist(FILM);
    });

    // Optimistic state visible while the mutation is pending.
    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(true);
    });

    // Reject — onMutate's snapshot should be restored by onError.
    await act(async () => {
      rejectMutation(new Error("server down"));
    });

    await waitFor(() => {
      expect(result.current.isWatchlisted(42)).toBe(false);
    });

    // A failed toggle surfaces a user-facing error (CODING_STANDARDS §8).
    expect(toastError).toHaveBeenCalledWith(
      "Couldn't save to your watchlist. Reverted.",
    );
  });
});
