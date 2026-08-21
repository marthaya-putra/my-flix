// Issue #128 — load-more stream runs must work in parallel. Drives the
// Recommendations component through its public API (rendered output + the
// Load more CTA), wires a real QueryClient + provider, and mocks ONLY the
// external edges: the session query module and `fetch` (NDJSON stream).
// The fetch mock mirrors real browser behavior: aborting the request signal
// rejects the pending body read with an AbortError DOMException.
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StreamEvent } from "@/lib/data/stream-events";
import type { FilmInfo } from "@/lib/types";
import { Recommendations } from "./recommendations";

// Mutable so the userId-change test can flip the session mid-stream.
const sessionState = vi.hoisted(() => ({ userId: "user-1" }));

vi.mock("@/lib/data/auth", () => ({
  sessionQuery: {
    queryKey: ["session"],
    queryFn: async () => ({ user: { id: sessionState.userId } }),
    staleTime: Number.POSITIVE_INFINITY,
  },
}));

// Server fns re-exported through the component tree — stub the module edge
// so no DB/server code runs in jsdom. Not exercised by these tests. The three
// getters resolve [] so the hooks' queries never warn about undefined data.
vi.mock("@/lib/data/preferences", () => ({
  addMoviePreference: vi.fn(),
  removeMoviePreference: vi.fn(),
  addPersonPreference: vi.fn(),
  removePersonPreference: vi.fn(),
  fetchUserPreferences: vi.fn(),
  addFilmInfoPreference: vi.fn(),
  addPersonInfoPreference: vi.fn(),
  toggleDislike: vi.fn(),
  removeUserDislikeByPreferenceIdFn: vi.fn(),
  getUserLikedItems: vi.fn(async () => []),
  getUserDislikedItems: vi.fn(async () => []),
  toggleMoviePreference: vi.fn(),
  getAllUserContent: vi.fn(async () => []),
  getUserWatchlistItems: vi.fn(async () => []),
  fetchUserWatchlist: vi.fn(async () => []),
  toggleWatchlistItem: vi.fn(),
}));

function makeFilmInfo(
  id: number,
  title: string,
  category: "movie" | "tv",
): FilmInfo {
  return {
    id,
    posterPath: "/poster.jpg",
    backdropPath: "/backdrop.jpg",
    title,
    overview: "Overview.",
    voteAverage: 7.5,
    releaseDate: "2024-01-01",
    category,
    genreIds: [1],
    genres: ["Drama"],
  };
}

type RunHandle = {
  categories: string[];
  signal: AbortSignal;
  emit: (evt: StreamEvent) => void;
  end: () => void;
};

const runs: RunHandle[] = [];

const fetchMock = vi.fn(
  async (_input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const body = JSON.parse(String(init?.body ?? "{}")) as {
      categories?: string[];
    };
    const signal = init?.signal ?? new AbortController().signal;
    let streamController: ReadableStreamDefaultController<Uint8Array> | null =
      null;
    let aborted = false;
    const stream = new ReadableStream<Uint8Array>({
      start(c) {
        streamController = c;
        signal.addEventListener("abort", () => {
          if (streamController && !aborted) {
            aborted = true;
            streamController.error(
              new DOMException("The operation was aborted.", "AbortError"),
            );
          }
        });
      },
    });
    const encoder = new TextEncoder();
    const handle: RunHandle = {
      categories: body.categories ?? [],
      signal,
      emit: (evt) => {
        if (!aborted && streamController) {
          streamController.enqueue(encoder.encode(`${JSON.stringify(evt)}\n`));
        }
      },
      end: () => {
        if (!aborted && streamController) streamController.close();
      },
    };
    runs.push(handle);
    return {
      ok: true,
      status: 200,
      body: stream,
      text: async () => "",
    } as unknown as Response;
  },
);

function runsFor(category: "movie" | "tv"): RunHandle[] {
  return runs.filter(
    (r) => r.categories.length === 1 && r.categories[0] === category,
  );
}

function runFor(category: "movie" | "tv"): RunHandle {
  const [run] = runsFor(category);
  if (!run) throw new Error(`No single-category run for ${category}`);
  return run;
}

function itemEvent(
  title: string,
  category: "movie" | "tv",
): Extract<StreamEvent, { type: "item" }> {
  return {
    type: "item",
    rec: {
      title,
      category,
      releasedYear: 2024,
      reason: "Because you liked test data.",
      imdbRating: 7.5,
      tmdbData: makeFilmInfo(title.length, title, category),
    },
  };
}

function groupStart(
  category: "movie" | "tv",
): Extract<StreamEvent, { type: "groupStart" }> {
  return { type: "groupStart", category, target: 1 };
}

function groupEndOk(
  category: "movie" | "tv",
): Extract<StreamEvent, { type: "groupEnd" }> {
  return { type: "groupEnd", category, status: "ok" };
}

// Complete the initial two-category run so both Load more CTAs render.
function completeInitialRun() {
  const initial = runs[0];
  initial.emit(groupStart("movie"));
  initial.emit(groupStart("tv"));
  initial.emit(itemEvent("Movie Alpha", "movie"));
  initial.emit(itemEvent("TV Alpha", "tv"));
  initial.emit(groupEndOk("movie"));
  initial.emit(groupEndOk("tv"));
  initial.end();
}

// A card renders its title more than once (alt text + label), so presence
// checks must accept multiple matches.
async function awaitTitle(title: string) {
  await waitFor(() => {
    expect(screen.getAllByText(title).length).toBeGreaterThan(0);
  });
}

function sectionFor(label: "Movies" | "TV") {
  const heading = screen.getByText(label, { selector: "h2" });
  const section = heading.closest("div");
  if (!section) throw new Error(`No section for ${label}`);
  return section as HTMLElement;
}

function loadMoreCTA(label: "Movies" | "TV") {
  return within(sectionFor(label)).getByText("Load more");
}

function renderRecommendations() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return { client, ...render(<Recommendations />, { wrapper }) };
}

// jsdom lacks the browser APIs the carousel (embla) activates with:
// matchMedia, IntersectionObserver, ResizeObserver. Stub all three so the
// carousel mounts; its scroll behavior is not under test.
class MockIntersectionObserver {
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn(() => []);
}
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }),
});
describe("Recommendations stream runs (issue #128)", () => {
  beforeEach(() => {
    runs.length = 0;
    sessionState.userId = "user-1";
    vi.stubGlobal("fetch", fetchMock);
    // Re-stubbed per test: afterEach unstubAllGlobals removes them, so a
    // module-level stubGlobal would only survive the first test.
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    vi.stubGlobal("ResizeObserver", MockResizeObserver);
  });

  afterEach(() => {
    // Explicit cleanup: vitest globals are off, so RTL's auto-cleanup
    // (registered via a global afterEach) never runs.
    cleanup();
    vi.unstubAllGlobals();
  });

  it("lets load-more runs for different categories stream in parallel", async () => {
    renderRecommendations();
    await waitFor(() => expect(runs.length).toBe(1));
    completeInitialRun();

    await awaitTitle("Movie Alpha");
    await awaitTitle("TV Alpha");
    await waitFor(() =>
      expect(screen.getAllByText("Load more")).toHaveLength(2),
    );

    // Start TV load-more and hold it open mid-stream.
    fireEvent.click(loadMoreCTA("TV"));
    await waitFor(() => expect(runs.length).toBe(2));

    // Start Movies load-more while TV is still streaming.
    fireEvent.click(loadMoreCTA("Movies"));
    await waitFor(() => expect(runs.length).toBe(3));

    // Both runs deliver their items and terminate normally.
    const movieRun = runFor("movie");
    const tvRun = runFor("tv");
    movieRun.emit(itemEvent("Movie Beta", "movie"));
    movieRun.emit(groupEndOk("movie"));
    movieRun.end();
    tvRun.emit(itemEvent("TV Beta", "tv"));
    tvRun.emit(groupEndOk("tv"));
    tvRun.end();

    await awaitTitle("Movie Beta");
    await awaitTitle("TV Beta");
    expect(tvRun.signal.aborted).toBe(false);
    expect(movieRun.signal.aborted).toBe(false);
  });

  it("does not abort the initial stream still streaming the other category", async () => {
    renderRecommendations();
    await waitFor(() => expect(runs.length).toBe(1));
    const initial = runs[0];

    // TV finishes inside the initial run; Movies is still pending and the
    // connection stays open.
    initial.emit(groupStart("movie"));
    initial.emit(groupStart("tv"));
    initial.emit(itemEvent("TV Alpha", "tv"));
    initial.emit(groupEndOk("tv"));
    await awaitTitle("TV Alpha");

    // Load-more on the finished category must not kill the open connection.
    fireEvent.click(loadMoreCTA("TV"));
    await waitFor(() => expect(runs.length).toBe(2));
    const tvRun = runFor("tv");
    tvRun.emit(itemEvent("TV Beta", "tv"));
    tvRun.emit(groupEndOk("tv"));
    tvRun.end();
    await awaitTitle("TV Beta");

    // The initial run keeps streaming Movies to completion.
    expect(initial.signal.aborted).toBe(false);
    initial.emit(itemEvent("Movie Alpha", "movie"));
    initial.emit(groupEndOk("movie"));
    initial.end();
    await awaitTitle("Movie Alpha");
  });

  it("aborts all active runs on unmount", async () => {
    const { unmount } = renderRecommendations();
    await waitFor(() => expect(runs.length).toBe(1));
    completeInitialRun();
    await awaitTitle("Movie Alpha");
    await waitFor(() =>
      expect(screen.getAllByText("Load more")).toHaveLength(2),
    );

    // Leave both load-more runs in-flight.
    fireEvent.click(loadMoreCTA("TV"));
    fireEvent.click(loadMoreCTA("Movies"));
    await waitFor(() => expect(runs.length).toBe(3));

    unmount();

    expect(runFor("tv").signal.aborted).toBe(true);
    expect(runFor("movie").signal.aborted).toBe(true);
  });

  it("aborts all active runs when the session (userId) changes", async () => {
    const { client } = renderRecommendations();
    await waitFor(() => expect(runs.length).toBe(1));
    completeInitialRun();
    await awaitTitle("Movie Alpha");
    await waitFor(() =>
      expect(screen.getAllByText("Load more")).toHaveLength(2),
    );

    // Leave both load-more runs in-flight.
    fireEvent.click(loadMoreCTA("TV"));
    fireEvent.click(loadMoreCTA("Movies"));
    await waitFor(() => expect(runs.length).toBe(3));

    // Session flip: the effect re-runs, its cleanup must abort both runs.
    // react-query notifies cache updates asynchronously, so assert on the
    // aborts through waitFor rather than immediately after act().
    await act(async () => {
      sessionState.userId = "user-2";
      client.setQueryData(["session"], { user: { id: "user-2" } });
    });

    await waitFor(() => {
      expect(runFor("tv").signal.aborted).toBe(true);
      expect(runFor("movie").signal.aborted).toBe(true);
    });
    // A fresh initial run fires for the new session.
    await waitFor(() => expect(runs.length).toBe(4));
    expect(runs[3].categories).toEqual(["movie", "tv"]);
  });

  it("ignores a same-category double-click while a run is in-flight", async () => {
    renderRecommendations();
    await waitFor(() => expect(runs.length).toBe(1));
    completeInitialRun();
    await awaitTitle("Movie Alpha");
    await waitFor(() =>
      expect(screen.getAllByText("Load more")).toHaveLength(2),
    );

    fireEvent.click(loadMoreCTA("TV"));
    await waitFor(() => expect(runs.length).toBe(2));

    // While in-flight, the TV section's CTA is replaced by the loading
    // card — no second TV run can start.
    expect(
      within(sectionFor("TV")).queryByText("Load more"),
    ).not.toBeInTheDocument();
    expect(runsFor("tv")).toHaveLength(1);

    // Completing the run re-enables the CTA for a fresh TV run.
    const tvRun = runFor("tv");
    tvRun.emit(itemEvent("TV Beta", "tv"));
    tvRun.emit(groupEndOk("tv"));
    tvRun.end();
    await awaitTitle("TV Beta");
    await waitFor(() => expect(loadMoreCTA("TV")).toBeInTheDocument());
    fireEvent.click(loadMoreCTA("TV"));
    await waitFor(() => expect(runsFor("tv")).toHaveLength(2));
  });
});
