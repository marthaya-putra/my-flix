// src/lib/data/recommendations.test.ts
// Issue #130 — StreamEvent contract lock. Drives runPipelines end-to-end
// with the AI model chain (../ai/models + ../ai/recommendations) and the
// TMDB edge (./search) mocked, then asserts the exact client-facing event
// sequence. Safety net for the upcoming Mastra refactor: if the pipeline's
// observable behaviour changes, these tests fail — not the feed.
import { describe, expect, it, vi } from "vitest";
import type { FilmInfo } from "@/lib/types";
import type { UserContent } from "./preferences";
import { runPipelines } from "./recommendations";
import type { StreamCategory, StreamEvent } from "./stream-events";

// Mock the external edges only. The model objects are opaque to the
// pipeline (passed through to getAIRecommendations), so plain objects do.
const getAIRecommendations = vi.hoisted(() => vi.fn());
vi.mock("../ai/recommendations", () => ({ getAIRecommendations }));
vi.mock("../ai/models", () => ({ googleModel: {}, mistralModel: {} }));

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

function makeTMDB(id: number, title: string, category: StreamCategory): FilmInfo {
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

// Wire the model mock to a per-round response queue; rounds past the queue
// get an empty success (generation produced nothing new).
function stubAIRounds(rounds: ReturnType<typeof aiOk>[]) {
  getAIRecommendations.mockImplementation(() =>
    Promise.resolve(rounds.shift() ?? aiOk([])),
  );
}

async function run(input?: {
  categories?: StreamCategory[];
  prefs?: UserContent;
}): Promise<StreamEvent[]> {
  const events: StreamEvent[] = [];
  for await (const event of runPipelines({
    loadPrefs: async () => input?.prefs ?? EMPTY_PREFS,
    previousRecommendations: [],
    categories: input?.categories,
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

function progressEvents(events: StreamEvent[]) {
  return events.filter(
    (e): e is Extract<StreamEvent, { type: "progress" }> => e.type === "progress",
  );
}

function groupEnds(events: StreamEvent[]) {
  return events.filter(
    (e): e is Extract<StreamEvent, { type: "groupEnd" }> => e.type === "groupEnd",
  );
}

// Build the exact expected sequence for a category that fills its target in
// one round: skeleton stages, then item/tick alternation, then finalizing.
function happySequence(
  category: StreamCategory,
  recs: RawRec[],
  films: FilmInfo[],
): StreamEvent[] {
  const seq: StreamEvent[] = [
    { type: "groupStart", category, target: 3 },
    { type: "progress", category, stage: "loading_preferences", found: 0, retry: false },
    { type: "progress", category, stage: "finding_titles", found: 0, retry: false },
  ];
  films.forEach((film, i) => {
    seq.push({
      type: "progress",
      category,
      stage: "looking_up_posters",
      found: i,
      retry: false,
    });
    seq.push({ type: "item", rec: { ...recs[i], tmdbData: film } });
  });
  seq.push({
    type: "progress",
    category,
    stage: "looking_up_posters",
    found: films.length,
    retry: false,
  });
  seq.push({
    type: "progress",
    category,
    stage: "finalizing",
    found: films.length,
    retry: false,
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
    const movieFilms = movieRecs.map((r, i) => makeTMDB(100 + i, r.title, "movie"));
    const tvFilms = tvRecs.map((r, i) => makeTMDB(200 + i, r.title, "tv"));
    stubTMDB(movieFilms, tvFilms);

    const events = await run();

    expect(eventsFor(events, "movie")).toEqual(
      happySequence("movie", movieRecs, movieFilms),
    );
    expect(eventsFor(events, "tv")).toEqual(happySequence("tv", tvRecs, tvFilms));
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
    expect(events[0]).toEqual({ type: "groupStart", category: "movie", target: 3 });
    expect(events[1]).toEqual({ type: "groupStart", category: "tv", target: 3 });
  });

  it("ends generation_failed when every model attempt fails", async () => {
    getAIRecommendations.mockResolvedValue(aiFail());
    stubTMDB([], []);

    const events = await run({ categories: ["movie"] });

    // google + mistral both attempted before giving up.
    expect(getAIRecommendations).toHaveBeenCalledTimes(2);
    expect(eventsFor(events, "movie").filter((e) => e.type === "item")).toEqual([]);
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

  it("ends enrichment_empty when TMDB lookup misses every generated title", async () => {
    const recs = ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie"));
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    stubTMDB([], []); // every query misses → tmdbData null every time

    const events = await run({ categories: ["movie"] });

    expect(eventsFor(events, "movie").filter((e) => e.type === "item")).toEqual([]);
    // Deficit loop runs all 5 rounds; rounds 2+ are flagged as retries.
    expect(
      progressEvents(events).map((p) => `${p.stage}:${p.retry}`),
    ).toEqual([
      "loading_preferences:false",
      ...[1, 2, 3, 4, 5].flatMap((r) => [
        `finding_titles:${r > 1}`,
        `looking_up_posters:${r > 1}`,
      ]),
      "finalizing:false",
    ]);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "enrichment_empty" },
    ]);
  });

  it("ends exhausted when every generated title maps to an excluded TMDB id", async () => {
    // User already liked TMDB id 100; every rec resolves to that id.
    const recs = ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie"));
    const films = recs.map((r) => makeTMDB(100, r.title, "movie"));
    stubAIRounds([aiOk(recs), aiOk([])]); // round 2 generates nothing new
    stubTMDB(films, []);

    const events = await run({
      categories: ["movie"],
      prefs: { ...EMPTY_PREFS, movies: [{ id: 100, title: "Liked Movie", year: 2023 }] },
    });

    expect(eventsFor(events, "movie").filter((e) => e.type === "item")).toEqual([]);
    expect(tokens(eventsFor(events, "movie"))).toEqual([
      "groupStart",
      "loading_preferences",
      "finding_titles",
      "looking_up_posters",
      "finding_titles", // round-2 deficit retry
      "finalizing",
      "groupEnd",
    ]);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "exhausted" },
    ]);
  });

  it("emits no events for the unrequested category", async () => {
    const recs = ["M1", "M2", "M3"].map((t) => makeRaw(`Movie ${t}`, "movie"));
    getAIRecommendations.mockImplementation(() => Promise.resolve(aiOk(recs)));
    stubTMDB(recs.map((r, i) => makeTMDB(100 + i, r.title, "movie")), []);

    const events = await run({ categories: ["movie"] });

    expect(eventsFor(events, "tv")).toEqual([]);
    expect(eventsFor(events, "movie").length).toBe(events.length);
    expect(searchTVsAPI).not.toHaveBeenCalled();
    expect(getAIRecommendations).toHaveBeenCalledWith(
      expect.objectContaining({ onlyCategory: "movie", requestedTvs: 0 }),
      expect.anything(),
    );
  });

  it("carries TMDB data on hit lookups and omits items on missed lookups", async () => {
    const hit1 = makeRaw("Movie Hit One", "movie");
    const miss = makeRaw("Movie Miss", "movie");
    const hit2 = makeRaw("Movie Hit Two", "movie");
    const recs = [hit1, miss, hit2];
    stubAIRounds([aiOk(recs), aiOk([])]); // round 2 generates nothing new
    const film1 = makeTMDB(101, hit1.title, "movie");
    const film2 = makeTMDB(102, hit2.title, "movie");
    stubTMDB([film1, film2], []); // "Movie Miss" resolves to nothing

    const events = await run({ categories: ["movie"] });

    const items = events.filter(
      (e): e is Extract<StreamEvent, { type: "item" }> => e.type === "item",
    );
    // Missed lookup emits no item; hits carry the full TMDB payload.
    expect(items.map((e) => e.rec.title)).toEqual([hit1.title, hit2.title]);
    expect(items[0].rec.tmdbData).toEqual(film1);
    expect(items[1].rec.tmdbData).toEqual(film2);
    expect(groupEnds(events)).toEqual([
      { type: "groupEnd", category: "movie", status: "ok" },
    ]);
  });
});
