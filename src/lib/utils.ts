import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DiscoverResult } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function convertToDiscoverResult(data: any): DiscoverResult {
  return {
    page: data.page,
    results: data.results.map((res: any) => ({
      id: res.id,
      backdropPath: `https://image.tmdb.org/t/p/w500${res.backdrop_path}`,
      posterPath: `https://image.tmdb.org/t/p/w500${res.poster_path}`,
      title: res.title || res.name,
      overview: res.overview,
      voteAverage: res.vote_average,
      releaseDate: res.release_date || res.first_air_date,
    })),
    totalPages: data.total_pages,
  };
}
