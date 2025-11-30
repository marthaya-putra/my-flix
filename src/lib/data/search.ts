import { createServerFn } from "@tanstack/react-start";
import { SearchResult, FilmInfo, Actor, Person } from "../types";
import { fetchFromTMDB, TMDB_IMAGE_BASE } from "./tmdb";
import { convertToDiscoverResult } from "../utils";
import { genres as movieGenres } from "./movies";
import { genres as tvGenres } from "./tvs";

// TMDB API response types for search
interface TMDBMovieResult {
  id: number;
  poster_path?: string;
  backdrop_path?: string;
  title: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  genre_ids?: number[];
  media_type: "movie";
}

interface TMDBTVResult {
  id: number;
  poster_path?: string;
  backdrop_path?: string;
  name: string;
  overview: string;
  vote_average: number;
  first_air_date?: string;
  genre_ids?: number[];
  media_type: "tv";
}

interface TMDBPersonResult {
  id: number;
  name: string;
  profile_path?: string;
  popularity: number;
  known_for_department?: string;
  adult?: boolean;
  gender?: number;
  known_for?: Array<{
    id: number;
    poster_path?: string;
    backdrop_path?: string;
    title?: string;
    name?: string;
    overview?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    genre_ids?: number[];
  }>;
  media_type: "person";
}

type TMDBSearchItem = TMDBMovieResult | TMDBTVResult | TMDBPersonResult;

interface TMDBSearchResponse {
  page: number;
  results: TMDBSearchItem[];
  total_pages: number;
  total_results: number;
}

interface TMDBPersonSearchResponse {
  page: number;
  results: TMDBPersonResult[];
  total_pages: number;
  total_results: number;
}

export function convertPersonSearchResult(data: TMDBPersonSearchResponse): Array<Person> {
  return data.results.map((person) => ({
    id: person.id,
    name: person.name,
    profileImageUrl: person.profile_path
      ? `${TMDB_IMAGE_BASE}${person.profile_path}`
      : "",
    popularity: person.popularity,
    imdbId: undefined, // TMDB doesn't provide IMDB ID in person search
    biography: undefined, // TMDB doesn't provide biography in person search
    knownFor: Array.isArray(person.known_for)
      ? person.known_for.map((film) => ({
          id: film.id,
          posterPath: film.poster_path
            ? `${TMDB_IMAGE_BASE}${film.poster_path}`
            : "",
          backdropPath: film.backdrop_path
            ? `${TMDB_IMAGE_BASE}${film.backdrop_path}`
            : "",
          title: film.title || film.name || "",
          overview: film.overview || "",
          voteAverage: film.vote_average || 0,
          releaseDate: film.release_date || film.first_air_date || "",
          category: film.first_air_date ? "tv" : "movie",
          genreIds: film.genre_ids || [],
          genres: [],
        }))
      : [],
  }));
}

export function convertToSearchResult(data: TMDBSearchResponse): SearchResult {
  const movies: Array<FilmInfo> = [];
  const tvShows: Array<FilmInfo> = [];
  const actors: Array<Actor> = [];

  data.results.forEach((item) => {
    if (item.media_type === "movie") {
      movies.push({
        id: item.id,
        posterPath: item.poster_path
          ? `${TMDB_IMAGE_BASE}${item.poster_path}`
          : "",
        backdropPath: item.backdrop_path
          ? `${TMDB_IMAGE_BASE}${item.backdrop_path}`
          : "",
        title: item.title,
        overview: item.overview,
        voteAverage: item.vote_average,
        releaseDate: item.release_date || "",
        category: "movie",
        genreIds: item.genre_ids || [],
        genres: Array.isArray(item.genre_ids)
          ? item.genre_ids
              .map((g: number) => movieGenres[g])
              .filter((g: string | undefined) => !!g)
          : [],
      });
    } else if (item.media_type === "tv") {
      tvShows.push({
        id: item.id,
        posterPath: item.poster_path
          ? `${TMDB_IMAGE_BASE}${item.poster_path}`
          : "",
        backdropPath: item.backdrop_path
          ? `${TMDB_IMAGE_BASE}${item.backdrop_path}`
          : "",
        title: item.name,
        overview: item.overview,
        voteAverage: item.vote_average,
        releaseDate: item.first_air_date || "",
        category: "tv",
        genreIds: item.genre_ids || [],
        genres: Array.isArray(item.genre_ids)
          ? item.genre_ids
              .map((g: number) => tvGenres[g])
              .filter((g: string | undefined) => !!g)
          : [],
      });
    } else if (item.media_type === "person") {
      actors.push({
        id: item.id,
        name: item.name,
        profileImageUrl: item.profile_path
          ? `${TMDB_IMAGE_BASE}${item.profile_path}`
          : "",
        profile_path: item.profile_path,
        popularity: item.popularity,
        known_for_department: item.known_for_department,
        adult: item.adult,
        gender: item.gender,
        knownFor: Array.isArray(item.known_for)
          ? item.known_for.map((film) => ({
              id: film.id,
              posterPath: film.poster_path
                ? `${TMDB_IMAGE_BASE}${film.poster_path}`
                : "",
              backdropPath: film.backdrop_path
                ? `${TMDB_IMAGE_BASE}${film.backdrop_path}`
                : "",
              title: film.title || film.name || "",
              overview: film.overview || "",
              voteAverage: film.vote_average || 0,
              releaseDate: film.release_date || film.first_air_date || "",
              category: film.first_air_date ? "tv" : "movie",
              genreIds: film.genre_ids || [],
              genres: [],
            }))
          : [],
      });
    }
  });

  return {
    page: data.page,
    movies,
    tvShows,
    actors,
    totalPages: {
      movies: data.total_pages,
      tvShows: data.total_pages,
      actors: data.total_pages,
    },
  };
}

export const searchMovies = createServerFn({
  method: "GET",
})
  .inputValidator((params: { query: string; page?: number }) => params)
  .handler(async ({ data }) => {
    if (!data.query || data.query.trim().length < 2) {
      return {
        page: 1,
        results: [],
        totalPages: 0,
      };
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/movie?query=${encodeURIComponent(data.query)}&include_adult=${includeAdult}&page=${data.page || 1}`;
      const result = await fetchFromTMDB(searchPath);
      return convertToDiscoverResult(result);
    } catch (error) {
      console.error("TMDB movie search error:", error);
      throw new Error("Failed to fetch movie search results");
    }
  });

export const searchTVs = createServerFn({
  method: "GET",
})
  .inputValidator((params: { query: string; page?: number }) => params)
  .handler(async ({ data }) => {
    if (!data.query || data.query.trim().length < 2) {
      return {
        page: 1,
        results: [],
        totalPages: 0,
      };
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/tv?query=${encodeURIComponent(data.query)}&include_adult=${includeAdult}&page=${data.page || 1}`;
      const result = await fetchFromTMDB(searchPath);
      return convertToDiscoverResult(result);
    } catch (error) {
      console.error("TMDB TV search error:", error);
      throw new Error("Failed to fetch TV search results");
    }
  });

export const searchActors = createServerFn({
  method: "GET",
})
  .inputValidator((params: { query: string; page?: number }) => params)
  .handler(async ({ data }) => {
    if (!data.query || data.query.trim().length < 2) {
      return {
        page: 1,
        actors: [],
        totalPages: 0,
      };
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/person?query=${encodeURIComponent(data.query)}&include_adult=${includeAdult}&page=${data.page || 1}`;
      const result = await fetchFromTMDB(searchPath);

      return {
        page: result.page,
        actors: convertPersonSearchResult(result),
        totalPages: result.total_pages,
      };
    } catch (error) {
      console.error("TMDB actor search error:", error);
      throw new Error("Failed to fetch actor search results");
    }
  });

export const searchContent = createServerFn({
  method: "GET",
})
  .inputValidator((query: string) => query)
  .handler(async ({ data }) => {
    if (!data || data.trim().length < 2) {
      return {
        page: 1,
        movies: [],
        tvShows: [],
        actors: [],
        totalPages: { movies: 0, tvShows: 0, actors: 0 },
      } as SearchResult;
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/multi?query=${encodeURIComponent(data)}&include_adult=${includeAdult}`;
      const tmdbResult = await fetchFromTMDB(searchPath);

      // Convert the TMDB multi-search result to our SearchResult format
      return convertToSearchResult(tmdbResult);
    } catch (error) {
      console.error("TMDB API error:", error);
      throw new Error("Failed to fetch search results");
    }
  });
