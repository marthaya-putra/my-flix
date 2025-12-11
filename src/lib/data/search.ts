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
  return data.results.map((person) => {
    // Determine category based on known_for_department
    let category: "actor" | "director" | "other";
    if (person.known_for_department === "Acting") {
      category = "actor";
    } else if (person.known_for_department === "Directing") {
      category = "director";
    } else {
      category = "other";
    }

    return {
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
      category,
    };
  });
}

export function convertToSearchResult(data: TMDBSearchResponse): SearchResult {
  const movies: Array<FilmInfo> = [];
  const tvShows: Array<FilmInfo> = [];
  const people: Array<Person> = [];

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
      // Determine category based on known_for_department
      let category: "actor" | "director" | "other";
      if (item.known_for_department === "Acting") {
        category = "actor";
      } else if (item.known_for_department === "Directing") {
        category = "director";
      } else {
        category = "other";
      }

      people.push({
        id: item.id,
        name: item.name,
        profileImageUrl: item.profile_path
          ? `${TMDB_IMAGE_BASE}${item.profile_path}`
          : "",
        popularity: item.popularity,
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
        category,
      });
    }
  });

  return {
    page: data.page,
    movies,
    tvShows,
    people,
    totalPages: {
      movies: data.total_pages,
      tvShows: data.total_pages,
      people: data.total_pages,
    },
  };
}

export const searchMovies = createServerFn({
  method: "GET",
})
  .inputValidator((params: { query: string; page?: number; primaryReleaseYear?: number }) => params)
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
      const params = new URLSearchParams({
        query: data.query,
        include_adult: includeAdult.toString(),
        page: (data.page || 1).toString(),
      });

      if (data.primaryReleaseYear) {
        params.append('primary_release_year', data.primaryReleaseYear.toString());
      }

      const searchPath = `/search/movie?${params.toString()}`;
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
  .inputValidator((params: { query: string; page?: number; firstAirDateYear?: number }) => params)
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
      const params = new URLSearchParams({
        query: data.query,
        include_adult: includeAdult.toString(),
        page: (data.page || 1).toString(),
      });

      if (data.firstAirDateYear) {
        params.append('first_air_date_year', data.firstAirDateYear.toString());
      }

      const searchPath = `/search/tv?${params.toString()}`;
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
        people: [],
        totalPages: 0,
      };
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/person?query=${encodeURIComponent(data.query)}&include_adult=${includeAdult}&page=${data.page || 1}`;
      const result = await fetchFromTMDB(searchPath);

      return {
        page: result.page,
        people: convertPersonSearchResult(result),
        totalPages: result.total_pages,
      };
    } catch (error) {
      console.error("TMDB person search error:", error);
      throw new Error("Failed to fetch person search results");
    }
  });

export const searchContent = createServerFn({
  method: "GET",
})
  .inputValidator((params: { query: string }) => params)
  .handler(async ({ data }) => {
    const query = data.query;
    if (!query || query.trim().length < 2) {
      return {
        page: 1,
        movies: [],
        tvShows: [],
        people: [],
        totalPages: { movies: 0, tvShows: 0, people: 0 },
      } as SearchResult;
    }

    try {
      const includeAdult = process.env.INCLUDE_ADULT_CONTENT === "true";
      const searchPath = `/search/multi?query=${encodeURIComponent(query)}&include_adult=${includeAdult}`;
      const tmdbResult = await fetchFromTMDB(searchPath);

      // Convert the TMDB multi-search result to our SearchResult format
      return convertToSearchResult(tmdbResult);
    } catch (error) {
      console.error("TMDB API error:", error);
      throw new Error("Failed to fetch search results");
    }
  });
