import { queryOptions } from "@tanstack/react-query";
import {
  fetchDiscoverMovies,
  fetchPopularMovies,
  fetchTrendingMovies,
} from "@/lib/data/movies";
import type { DiscoverResult } from "@/lib/types";
import type { DiscoverFilters } from "./types";

/**
 * Query-key factories + `queryOptions` for the movie domain.
 *
 * Keys encode the same args the server fns take, so the QueryClient
 * cache dedupes between SSR prefetch and client consumption. Each
 * route loader calls `queryClient.prefetchQuery(...)` with one of
 * these options, and the component reads the same options via
 * `useSuspenseQuery(...)` — no second source of truth for the key.
 */
export const moviesKeys = {
  all: ["movies"] as const,
  discover: ({ page, genres, rating, year }: DiscoverFilters) =>
    [...moviesKeys.all, "discover", { page, genres, rating, year }] as const,
  popular: (page: number = 1) =>
    [...moviesKeys.all, "popular", page] as const,
  trending: (timeWindow: "day" | "week" = "week") =>
    [...moviesKeys.all, "trending", timeWindow] as const,
};

export const discoverMoviesOptions = (args: DiscoverFilters) =>
  queryOptions<DiscoverResult>({
    queryKey: moviesKeys.discover(args),
    queryFn: () =>
      fetchDiscoverMovies({
        data: {
          page: args.page,
          with_genres: args.genres,
          vote_average_gte: args.rating,
          year: args.year,
        },
      }),
  });

export const popularMoviesOptions = (page: number = 1) =>
  queryOptions<DiscoverResult>({
    queryKey: moviesKeys.popular(page),
    queryFn: () => fetchPopularMovies({ data: page }),
  });

export const trendingMoviesOptions = (
  timeWindow: "day" | "week" = "week",
) =>
  queryOptions<DiscoverResult>({
    queryKey: moviesKeys.trending(timeWindow),
    queryFn: () => fetchTrendingMovies({ data: timeWindow }),
  });
