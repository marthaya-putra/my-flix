import { queryOptions } from "@tanstack/react-query";
import { searchActors, searchMovies, searchTVs } from "@/lib/data/search";
import type { DiscoverResult, PersonSearchResult } from "@/lib/types";
import type { SearchArgs } from "./types";

/**
 * Query-key factories + `queryOptions` for search (movies, tvs, people).
 * See `./movies.ts` for the design rationale.
 */
export const searchKeys = {
  all: ["search"] as const,
  movies: ({ query, page }: SearchArgs) =>
    [...searchKeys.all, "movies", { query, page }] as const,
  tvs: ({ query, page }: SearchArgs) =>
    [...searchKeys.all, "tvs", { query, page }] as const,
  people: ({ query, page }: SearchArgs) =>
    [...searchKeys.all, "people", { query, page }] as const,
};

export const searchMoviesOptions = ({ query, page }: SearchArgs) =>
  queryOptions<DiscoverResult>({
    queryKey: searchKeys.movies({ query, page }),
    queryFn: () => searchMovies({ data: { query, page } }),
  });

export const searchTvsOptions = ({ query, page }: SearchArgs) =>
  queryOptions<DiscoverResult>({
    queryKey: searchKeys.tvs({ query, page }),
    queryFn: () => searchTVs({ data: { query, page } }),
  });

export const searchPeopleOptions = ({ query, page }: SearchArgs) =>
  queryOptions<PersonSearchResult>({
    queryKey: searchKeys.people({ query, page }),
    queryFn: () => searchActors({ data: { query, page } }),
  });
