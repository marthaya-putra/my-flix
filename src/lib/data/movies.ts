import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { convertToDiscoverResult } from "../utils";
import { fetchFromTMDB } from "./tmdb";

// CODING_STANDARDS.md §7: inputValidator is zod-or-remove. These were
// identity arrows that carried only a TS annotation and validated
// nothing at runtime. Replaced with real zod schemas. Defaults that
// lived in the old arrow signatures are re-encoded via `.default(...)`
// so the fn-level contract (input optional) is preserved.
const timeWindowSchema = z
  .union([z.literal("day"), z.literal("week")])
  .default("week");
const popularMoviesSchema = z.number().int().min(1).default(1);
const discoverMoviesSchema = z.object({
  page: z.number(),
  with_genres: z.string().optional(),
  vote_average_gte: z.number().optional(),
  year: z.number().optional(),
});

export const fetchTrendingMovies = createServerFn({
  method: "GET",
})
  .validator(timeWindowSchema)
  .handler(async ({ data }) => {
    const result = await fetchFromTMDB(`/trending/movie/${data}`);
    return convertToDiscoverResult(result);
  });

export const fetchPopularMovies = createServerFn({
  method: "GET",
})
  .validator(popularMoviesSchema)
  .handler(async ({ data }) => {
    const result = await fetchFromTMDB(
      `/movie/popular?language=en-US&region=US&page=${String(data)}`,
    );
    return convertToDiscoverResult(result);
  });

export const fetchDiscoverMovies = createServerFn({
  method: "GET",
})
  .validator(discoverMoviesSchema)
  .handler(async ({ data }) => {
    const today = new Date().toISOString().split("T")[0];
    const queryParams = new URLSearchParams();

    queryParams.set("page", String(data.page));
    queryParams.set("include_adult", "true");
    queryParams.set("region", "US");
    queryParams.set("primary_release_date.lte", today);
    queryParams.set("include_adult", "true");
    queryParams.set("sort_by", "primary_release_date.desc");

    if (
      data.with_genres &&
      typeof data.with_genres === "string" &&
      data.with_genres.trim()
    ) {
      queryParams.set("with_genres", data.with_genres);
    }

    if (data.vote_average_gte) {
      queryParams.set("vote_average.gte", String(data.vote_average_gte));
    }

    if (data.year) {
      queryParams.set("primary_release_date.gte", `${String(data.year)}-01-01`);
      queryParams.set("primary_release_date.lte", `${String(data.year)}-12-31`);
    }

    const result = await fetchFromTMDB(
      `/discover/movie?${queryParams.toString()}`,
    );
    return convertToDiscoverResult(result);
  });
