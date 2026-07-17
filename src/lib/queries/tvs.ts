import { queryOptions } from "@tanstack/react-query";
import {
  fetchAiringTodayTvs,
  fetchDiscoverTvs,
  fetchOnTheAirTvs,
  fetchTrendingTvs,
} from "@/lib/data/tvs";
import type { DiscoverResult } from "@/lib/types";
import type { DiscoverFilters } from "./types";

/**
 * Query-key factories + `queryOptions` for the TV domain.
 * See `./movies.ts` for the design rationale.
 */
export const tvsKeys = {
  all: ["tvs"] as const,
  discover: ({ page, genres, rating, year }: DiscoverFilters) =>
    [...tvsKeys.all, "discover", { page, genres, rating, year }] as const,
  airingToday: ({ page, timezone }: { page: number; timezone: string }) =>
    [...tvsKeys.all, "airing-today", { page, timezone }] as const,
  onTheAir: ({ page, timezone }: { page: number; timezone: string }) =>
    [...tvsKeys.all, "on-the-air", { page, timezone }] as const,
  trending: (timeWindow: "day" | "week" = "week") =>
    [...tvsKeys.all, "trending", timeWindow] as const,
};

export const discoverTvsOptions = (args: DiscoverFilters) =>
  queryOptions<DiscoverResult>({
    queryKey: tvsKeys.discover(args),
    queryFn: () =>
      fetchDiscoverTvs({
        data: {
          page: args.page,
          with_genres: args.genres,
          vote_average_gte: args.rating,
          year: args.year,
        },
      }),
  });

export const airingTodayTvsOptions = (args: {
  page: number;
  timezone: string;
}) =>
  queryOptions<DiscoverResult>({
    queryKey: tvsKeys.airingToday(args),
    queryFn: () => fetchAiringTodayTvs({ data: args }),
  });

export const onTheAirTvsOptions = (args: { page: number; timezone: string }) =>
  queryOptions<DiscoverResult>({
    queryKey: tvsKeys.onTheAir(args),
    queryFn: () => fetchOnTheAirTvs({ data: args }),
  });

export const trendingTvsOptions = (timeWindow: "day" | "week" = "week") =>
  queryOptions<DiscoverResult>({
    queryKey: tvsKeys.trending(timeWindow),
    queryFn: () => fetchTrendingTvs({ data: timeWindow }),
  });
