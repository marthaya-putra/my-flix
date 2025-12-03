import { FilmInfo, Person } from "@/lib/types";

// Base content interface for search results
export interface BaseContentItem {
  id: number;
  title: string;
  subtitle: string;
  rating?: number;
  date?: string;
  imageUrl: string;
  genres: string[];
}

// Content type for display
export type ContentType = "movie" | "tv" | "person";

// Helper to get subtitle for content type
export function getContentSubtitle(type: ContentType): string {
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

// Transform TMDB movie result to base content
export function transformMovieResult(movie: any): BaseContentItem {
  return {
    id: movie.id,
    title: movie.title,
    subtitle: movie.release_date ? new Date(movie.release_date).getFullYear().toString() : "",
    rating: movie.vote_average,
    date: movie.release_date,
    imageUrl: movie.poster_path ? `${process.env.TMDB_IMAGE_BASE}${movie.poster_path}` : "",
    genres: movie.genre_ids
      ? movie.genre_ids
          .map((g: number) => movieGenres[g])
          .filter((g: string | undefined) => !!g)
      : [],
  };
}

// Transform TMDB TV result to base content
export function transformTvResult(tv: any): BaseContentItem {
  return {
    id: tv.id,
    title: tv.name,
    subtitle: tv.first_air_date ? new Date(tv.first_air_date).getFullYear().toString() : "",
    rating: tv.vote_average,
    date: tv.first_air_date,
    imageUrl: tv.poster_path ? `${process.env.TMDB_IMAGE_BASE}${tv.poster_path}` : "",
    genres: tv.genre_ids
      ? tv.genre_ids
          .map((g: number) => tvGenres[g])
          .filter((g: string | undefined) => !!g)
      : [],
  };
}

// Transform TMDB person result to base content
export function transformPersonResult(person: any): BaseContentItem {
  return {
    id: person.id,
    title: person.name,
    subtitle: `Popularity: ${person.popularity.toFixed(1)}`,
    rating: undefined,
    date: undefined,
    imageUrl: person.profile_path ? `${process.env.TMDB_IMAGE_BASE}${person.profile_path}` : "",
    genres: [],
  };
}

// Search response interface for tabbed search
export interface SearchResponse {
  items: BaseContentItem[];
  page: number;
  totalPages: number;
}

// Transform TMDB multi-search results
export function transformMultiSearchResults(data: any): SearchResponse {
  const items: BaseContentItem[] = [];

  data.results?.forEach((item: any) => {
    if (item.media_type === "movie") {
      items.push(transformMovieResult(item));
    } else if (item.media_type === "tv") {
      items.push(transformTvResult(item));
    } else if (item.media_type === "person") {
      items.push(transformPersonResult(item));
    }
  });

  return {
    items,
    page: data.page || 1,
    totalPages: data.total_pages || 1,
  };
}