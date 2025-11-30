import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DiscoverResult, FilmType } from "./types";
import { genres } from "./data/movies";
import { TMDB_IMAGE_BASE } from "./data/tmdb";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToDiscoverResult(data: any): DiscoverResult {
  return {
    page: data.page,
    results: data.results.map((res: any) => ({
      id: res.id,
      backdropPath: `${TMDB_IMAGE_BASE}${res.backdrop_path}`,
      posterPath: `${TMDB_IMAGE_BASE}${res.poster_path}`,
      title: res.title || res.name,
      overview: res.overview,
      voteAverage: res.vote_average,
      releaseDate: res.release_date || res.first_air_date,
      category: res.first_air_date ? "tv" : "movie",
      genres: Array.isArray(res.genre_ids)
        ? res.genre_ids.map((g: number) => genres[g]).filter((g) => g!!)
        : [],
    })),
    totalPages: data.total_pages,
  };
}

export function getReleasedYear(releaseDate: string) {
  return releaseDate.split("-")[0];
}
