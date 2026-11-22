// src/lib/data/recommendations.test.ts
// Issue #130 — StreamEvent contract lock. Drives runPipelines end-to-end
// with the Mastra agent edge (../ai/recommendations) and the TMDB edge
// (./search) mocked, then asserts the exact client-facing event sequence.
// Title-first shape (docs/designs/title-first-recommendations.md): items
// carry LLM fields only, poster lookups patch in afterwards, one LLM round
// with overask, matcher-based exclusion, optional taste profile.
import { describe, expect, it, vi } from "vitest";
import type { FilmInfo } from "@/lib/types";
import type { UserContent } from "./preferences";
import { runPipelines } from "./recommendations";
import type { StreamCategory, StreamEvent } from "./stream-events";

// Mock the external edges only. Model routing (gemini → mistral) is
// internal to the agent, so the pipeline sees one call per round.
const getAIRecommendations = vi.hoisted(() => vi.fn());
vi.mock("../ai/recommendations", () => ({ getAIRecommendations }));

const searchMoviesAPI = vi.hoisted(() => vi.fn());
const searchTVsAPI = vi.hoisted(() => vi.fn());
vi.mock("./search", () => ({ searchMoviesAPI, searchTVsAPI }));

// Shape the pipeline reads out of a successful getAIRecommendations call.
type RawRec = {
  title: string;
  category: StreamCategory;
  releasedYear: number;
  reason: string;
  imdbRating: number;
};

const EMPTY_PREFS: UserContent = {
  movies: [],
  tvs: [],
  dislikedMovies: [],
  dislikedTvs: [],
  actors: [],
  directors: [],
  genres: [],
};

function makeTMDB(
  id: number,
  title: string,
  category: StreamCategory,
): FilmInfo {
  return {
    id,
    title,
    posterPath: `/${title.toLowerCase().replace(/\s+/g, "-")}.jpg`,
    backdropPath: "/backdrop.jpg",
    overview: `${title} overview`,
    voteAverage: 8,
    releaseDate: "2023-01-01",
    category,
    genreIds: [1],
    genres: ["Drama"],
  };
}

function makeRaw(title: string, category: StreamCategory): RawRec {
  return {
    title,
    category,
    releasedYear: 2023,
    reason: `Matches your love of ${category === "movie" ? "film" : "series"} X`,
    imdbRating: 8,
  };
}

function aiOk(recs: RawRec[]) {
  return { success: true as const, data: { recommendations: recs } };
}

function aiFail() {
  return { success: false as const, error: "model down" };
}

// Route TMDB lookups through a per-title registry: a query matching a
// registered title resolves with that FilmInfo, anything else misses.
function stubTMDB(movies: FilmInfo[], tvs: FilmInfo[]) {
  const byTitle = (films: FilmInfo[]) => (params: { query: string }) =>
    Promise.resolve({ results: films.filter((f) => f.title === params.query) });
  searchMoviesAPI.mockImplementation(byTitle(movies));
  searchTVsAPI.mockImplementation(byTitle(tvs));
}

// Wire the model mock to answer by category (happy two-category default).
function stubAIByCategory(
  movieRecs: RawRec[],
  tvRecs: RawRec[],
): { movieRecs: RawRec[]; tvRecs: RawRec[] } {
  getAIRecommendations.mockImplementation(
    (args: { onlyCategory: StreamCategory }) =>
      Promise.resolve(aiOk(args.onlyCategory === "movie" ? movieRecs : tvRecs)),
  );
  return { movieRecs, tvRecs };
}

async function run(input?: {
  categories?: StreamCategory[];
  prefs?: UserContent;
  deriveProfile?: (content: UserContent) => Promise<string | null>;
}): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of runPipelines({
    loadPrefs: async () => input?.prefs ?? EMPTY_PREFS,
    previousRecommendations: [],
    categories: input?.categories,
    deriveProfile: input?.deriveProfile,
  })) {
    events.push(event);
  }
  return events;
}

// An item carries its category on rec; every other event carries it inline.
function eventsFor(events: StreamEvent[], category: StreamCategory) {
  return events.filter((e) =>
    e.type === "item" ? e.rec.category === category : e.category === category,
  );
}

// Collapse events to comparable tokens: progress → its stage, others → type.
function tokens(events: StreamEvent[]) {
  return events.map((e) => (e.type === "progress" ? e.stage : e.type));
}

function groupEnds(events: StreamEvent[]) {
  return events.filter(
    (e): e is Extract<StreamEvent, { type: "groupEnd" }> =>
      e.type === "groupEnd",
  );
}

// Build the exact expected sequence for a category whose single round fills
// the target: stage skeleton, items without tmdbData, one poster patch per
// item in item order, finalizing.
function happySequence(
  category: StreamCategory,
  recs: RawRec[],
  films: FilmInfo[],
): StreamEvent[] {
  const seq: StreamEvent[] = [
    { type: "groupStart", category, target: 3 },
    { type: "progress", category, stage: "loading_preferences", found: 0 },
    { type: "progress", category, stage: "finding_titles", found: 0 },
  ];
  films.forEach((_film, i) => {
    seq.push({ type: "item", rec: { ...recs[i] } });
  });
  seq.push({
    type: "progress",
    category,
    stage: "looking_up_posters",
    found: films.length,
  });
  films.forEach((film, i) => {
    seq.push({
      type: "itemPatch",
      category,
      title: recs[i].title,
      releasedYear: recs[i].releasedYear,
      filmInfo: film,
    });
  });
  seq.push({
    type: "progress",
    category,
    stage: "finalizing",
    found: films.length,
  });
  seq.push({ type: "groupEnd", category, status: "ok" });
  return seq;
}

describe("runPipelines StreamEvent contract", () => {
  it("emits the exact per-category sequence for a successful two-category run", async () => {
    const { movieRecs, tvRecs } = stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    const movieFilms = movieRecs.map((r, i) =>
      makeTMDB(100 + i, r.title, "movie"),
    );
    const tvFilms = tvRecs.map((r, i) => makeTMDB(200 + i, r.title, "tv"));
    stubTMDB(movieFilms, tvFilms);

    const events = await run();

    expect(eventsFor(events, "movie")).toEqual(
      happySequence("movie", movieRecs, movieFilms),
    );
    expect(eventsFor(events, "tv")).toEqual(
      happySequence("tv", tvRecs, tvFilms),
    );
    // Exactly one groupEnd per requested category, both terminal status ok.
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "ok" },
      { type: "groupEnd", category: "tv", status: "ok" },
    ]);
  });

  it("emits every groupStart before any item event", async () => {
    const { movieRecs, tvRecs } = stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    stubTMDB(
      movieRecs.map((r, i) => makeTMDB(100 + i, r.title, "movie")),
      tvRecs.map((r, i) => makeTMDB(200 + i, r.title, "tv")),
    );

    const events = await run();

    const lastGroupStart = events.reduce(
      (last, e, i) => (e.type === "groupStart" ? i : last),
      -1,
    );
    const firstItem = events.findIndex((e) => e.type === "item");
    expect(lastGroupStart).toBeLessThan(firstItem);
    // Both groupStarts lead the stream, in requested-category order.
    expect(events[0]).toEqual({
      type: "groupStart",
      category: "movie",
      target: 3,
    });
    expect(events[1]).toEqual({
      type: "groupStart",
      category: "tv",
      target: 3,
    });
  });

  it("ends generation_failed when every model attempt fails", async () => {
    getAIRecommendations.mockResolvedValue(aiFail());
    stubTMDB([], []);

    const events = await run({ categories: ["movie"] });

    // One call per round — the google→mistral chain is internal to the
    // agent and surfaces here as a single failed call.
    expect(getAIRecommendations).toHaveBeenCalledTimes(1);
    expect(eventsFor(events, "movie").filter((e) => e.type === "item")).toEqual(
      [],
    );
    expect(tokens(eventsFor(events, "movie"))).toEqual([
      "groupStart",
      "loading_preferences",
      "finding_titles",
      "finalizing",
      "groupEnd",
    ]);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "generation_failed" },
    ]);
  });

  it("emits items plus itemPatch{filmInfo:null} and status ok when TMDB misses every title", async () => {
    const recs = ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie"));
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    stubTMDB([], []); // every query misses → filmInfo null on every patch

    const events = await run({ categories: ["movie"] });

    const movieEvents = eventsFor(events, "movie");
    // A lookup miss never removes a card: items still emitted, LLM fields only.
    const items = movieEvents.filter(
      (e): e is Extract<StreamEvent, { type: "item" }> => e.type === "item",
    );
    expect(items).toHaveLength(3);
    items.forEach((e) => expect(e.rec.tmdbData).toBeUndefined());
    // Patches carry null in item order; single round, no retries.
    const patches = movieEvents.filter(
      (e): e is Extract<StreamEvent, { type: "itemPatch" }> =>
        e.type === "itemPatch",
    );
    expect(patches.map((p) => p.title)).toEqual(recs.map((r) => r.title));
    patches.forEach((p) => expect(p.filmInfo).toBeNull());
    expect(getAIRecommendations).toHaveBeenCalledTimes(1);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "ok" },
    ]);
  });

  it("filters title+year collisions via the matcher, one round, no retries", async () => {
    // User already liked "Liked Movie" (2023). The round returns 6 (overask):
    // two candidates collide by title+year (±1), the rest survive; the cap
    // keeps exactly the target.
    const colliding = [
      makeRaw("Liked Movie", "movie"),
      makeRaw("Liked Movie", "movie"), // year ±1 variant below
    ];
    colliding[1].releasedYear = 2024; // within ±1 of the liked 2023
    const fresh = ["F1", "F2", "F3", "F4"].map((t) =>
      makeRaw(`Movie ${t}`, "movie"),
    );
    const recs = [...colliding, ...fresh];
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    stubTMDB(
      fresh.slice(0, 3).map((r, i) => makeTMDB(100 + i, r.title, "movie")),
      [],
    );

    const events = await run({
      categories: ["movie"],
      prefs: {
        ...EMPTY_PREFS,
        movies: [{ id: 100, title: "Liked Movie", year: 2023 }],
      },
    });

    // Exactly one LLM call — no deficit rounds.
    expect(getAIRecommendations).toHaveBeenCalledTimes(1);
    const items = events.filter(
      (e): e is Extract<StreamEvent, { type: "item" }> => e.type === "item",
    );
    expect(items.map((e) => e.rec.title)).toEqual([
      "Movie F1",
      "Movie F2",
      "Movie F3",
    ]);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "ok" },
    ]);
  });

  it("emits no events for the unrequested category", async () => {
    const recs = ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie"));
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    stubTMDB(
      recs.map((r, i) => makeTMDB(100 + i, r.title, "movie")),
      [],
    );

    const events = await run({ categories: ["movie"] });

    expect(eventsFor(events, "tv")).toEqual([]);
    expect(eventsFor(events, "movie").length).toBe(events.length);
    expect(searchTVsAPI).not.toHaveBeenCalled();
    expect(getAIRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ onlyCategory: "movie", requestedTvs: 0 }),
      // Second arg is the per-run trace context (runId + traceId).
      expect.objectContaining({
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
      }),
    );
  });

  it("asks 2× target and carries FilmInfo on hit patches, null on missed patches", async () => {
    const hit1 = makeRaw("Movie Hit One", "movie");
    const miss = makeRaw("Movie Miss", "movie");
    const hit2 = makeRaw("Movie Hit Two", "movie");
    const recs = [hit1, miss, hit2];
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    const film1 = makeTMDB(101, hit1.title, "movie");
    const film2 = makeTMDB(102, hit2.title, "movie");
    stubTMDB([film1, film2], []); // "Movie Miss" resolves to nothing

    const events = await run({ categories: ["movie"] });

    // Overask: the single round requests 6 movies.
    expect(getAIRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ onlyCategory: "movie", requestedMovies: 6 }),
      expect.objectContaining({
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
      }),
    );
    // Inverted from the blocking-enrichment era: the missed lookup still
    // emits its item; only its patch is null.
    const items = events.filter(
      (e): e is Extract<StreamEvent, { type: "item" }> => e.type === "item",
    );
    expect(items.map((e) => e.rec.title)).toEqual([
      hit1.title,
      miss.title,
      hit2.title,
    ]);
    items.forEach((e) => expect(e.rec.tmdbData).toBeUndefined());
    const patches = events.filter(
      (e): e is Extract<StreamEvent, { type: "itemPatch" }> =>
        e.type === "itemPatch",
    );
    expect(patches.map((p) => p.filmInfo)).toEqual([film1, null, film2]);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "ok" },
    ]);
  });
});

describe("runPipelines taste profile", () => {
  it("threads the derived profile text into the AI call args", async () => {
    stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    stubTMDB([], []);

    await run({ deriveProfile: async () => "Themes: cerebral sci-fi" });

    expect(getAIRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ tasteProfile: "Themes: cerebral sci-fi" }),
      expect.objectContaining({
        traceId: expect.stringMatching(/^[0-9a-f]{32}$/),
      }),
    );
  });

  it("builds args exactly as today when no deriveProfile thunk is supplied", async () => {
    stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    stubTMDB([], []);

    await run();

    const firstCall = getAIRecommendations.mock.calls[0][0];
    expect(firstCall).not.toHaveProperty("tasteProfile");
    expect(firstCall.requestedMovies).toBe(6);
    expect(firstCall.minImdbRating).toBe(7.5);
  });

  it("derives the profile exactly once across both categories", async () => {
    stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    stubTMDB([], []);
    const deriveProfile = vi.fn(async () => "Themes: x");

    await run({ deriveProfile });

    expect(deriveProfile).toHaveBeenCalledTimes(1);
  });

  it("treats a null profile as absent (fail-open)", async () => {
    stubAIByCategory(
      ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie")),
      ["T1", "T2", "T3"].map((t) => makeRaw(`Show ${t}`, "tv")),
    );
    stubTMDB([], []);

    await run({ deriveProfile: async () => null });

    const firstCall = getAIRecommendations.mock.calls[0][0];
    expect(firstCall).not.toHaveProperty("tasteProfile");
  });
});
