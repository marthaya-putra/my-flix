import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { DiscoverResult, FilmType } from "./types";

export function getContentSubtitle(type: 'movie' | 'tv' | 'person'): string {
  switch (type) {
    case "movie":
      return "Movie";
    case "tv":
      return "TV Show";
    case "person":
      return "Person";
    default:
      return "Content";
  }
}
import { genres } from "./data/movies";
import { TMDB_IMAGE_BASE } from "./data/tmdb";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 44px invisible hit zone around small icon buttons (Apple HIG / Material
 * minimum touch size). Pure ::before extension — zero visual change; the
 * pseudo-element is part of its host element for event handling, so clicks
 * in the expanded zone fire the button's onClick. Apply to icon-only
 * Buttons (32px and below) that sit in card overlays or tight corners where
 * near-misses are likely.
 */
export const HIT_ZONE =
  "relative before:absolute before:inset-[-6px] before:content-['']";

/**
 * Page size for the /watchlist grid — matches /movies and /tvs (TMDB's
 * default of 20). Lives here so both the server fn (to compute totalPages)
 * and the optimistic update in `useWatchlist` (to fix up the count when a
 * row is added or removed from a cached page) read one source of truth.
 */
export const WATCHLIST_PAGE_SIZE = 20;

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

// Utility functions for preferences
export function getPreferenceIcon(type: 'movie' | 'tv' | 'person') {
  switch (type) {
    case 'movie':
      return '🎬';
    case 'tv':
      return '📺';
    case 'person':
      return '🎭';
    default:
      return '⭐';
  }
}

export function formatPreferenceLabel(type: 'movie' | 'tv' | 'person') {
  switch (type) {
    case 'movie':
      return 'Movie';
    case 'tv':
      return 'TV Show';
    case 'person':
      return 'Actor';
    default:
      return 'Content';
  }
}
