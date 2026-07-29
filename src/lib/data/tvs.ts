import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { convertToDiscoverResult } from "../utils";
import { fetchFromTMDB } from "./tmdb";

// See movies.ts — same §7 cleanup. Defaults from the old arrow
// signatures are re-encoded via `.default(...)` to keep the fn-level
// contract unchanged.
const timeWindowSchema = z
  .union([z.literal("day"), z.literal("week")])
  .default("week");
const airingOnTheAirSchema = z
  .object({ page: z.number().optional(), timezone: z.string().optional() })
  .optional();
const discoverTvsSchema = z.object({
  page: z.number(),
  with_genres: z.string().optional(),
  vote_average_gte: z.number().optional(),
  year: z.number().optional(),
});

export const fetchTrendingTvs = createServerFn({
  method: "GET",
})
  .validator(timeWindowSchema)
  .handler(async ({ data }) => {
    const result = await fetchFromTMDB(`/trending/tv/${data}`);
    return convertToDiscoverResult(result);
  });

export const fetchAiringTodayTvs = createServerFn({
  method: "GET",
})
  .validator(airingOnTheAirSchema)
  .handler(async ({ data }) => {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(data?.page || 1));
    if (data?.timezone) {
      queryParams.set("timezone", data.timezone);
    }

    const result = await fetchFromTMDB(
      `/tv/airing_today?${queryParams.toString()}`,
    );
    return convertToDiscoverResult(result);
  });

export const fetchOnTheAirTvs = createServerFn({
  method: "GET",
})
  .validator(airingOnTheAirSchema)
  .handler(async ({ data }) => {
    const queryParams = new URLSearchParams();
    queryParams.set("page", String(data?.page || 1));
    if (data?.timezone) {
      queryParams.set("timezone", data.timezone);
    }
    const result = await fetchFromTMDB(
      `/tv/on_the_air?${queryParams.toString()}`,
    );
    return convertToDiscoverResult(result);
  });

export const fetchDiscoverTvs = createServerFn({
  method: "GET",
})
  .validator(discoverTvsSchema)
  .handler(async ({ data }) => {
    const queryParams = new URLSearchParams();
    const today = new Date().toISOString().split("T")[0];

    queryParams.set("page", String(data.page));
    queryParams.set("include_adult", process.env.INCLUDE_ADULT || "false");
    queryParams.set("sort_by", "first_air_date.desc");
    queryParams.set("watch_region", "US");
    queryParams.set("air_date.lte", `${today}`);

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
      queryParams.set("air_date.gte", `${String(data.year)}-01-01`);
      queryParams.set("air_date.lte", `${String(data.year)}-12-31`);
    }

    const result = await fetchFromTMDB(
      `/discover/tv?${queryParams.toString()}`,
    );
    return convertToDiscoverResult(result);
  });
