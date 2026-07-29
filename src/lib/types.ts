export type FilmType = "movie" | "tv";
export type ContentType = "movie" | "tv" | "person";
export type Genre = {
  id: number;
  name: string;
};
export type MovieSearchParam = {
  type?: FilmType;
  genres?: string;
  rating?: number;
  page?: number;
};

export type FilmInfo = {
  id: number;
  posterPath: string;
  backdropPath: string;
  title: string;
  overview: string;
  voteAverage: number;
  releaseDate: string;
  category: FilmType;
  genreIds: Array<number>;
  genres: Array<string>;
};

export type DiscoverResult = {
  page: number;
  results: Array<FilmInfo>;
  totalPages: number;
};

export type PersonSearchResult = {
  page: number;
  people: Array<Person>;
  totalPages: number;
};

export type SearchResult = {
  page: number;
  movies: Array<FilmInfo>;
  tvShows: Array<FilmInfo>;
  people: Array<Person>;
  totalPages: {
    movies: number;
    tvShows: number;
    people: number;
  };
};

export type Actor = {
  id: number;
  name: string;
  profileImageUrl: string;
  profile_path?: string;
  popularity: number;
  known_for_department?: string;
  adult?: boolean;
  gender?: number;
  knownFor?: Array<FilmInfo>;
};

export type Person = {
  id: number;
  name: string;
  profileImageUrl: string;
  popularity: number;
  imdbId?: string;
  biography?: string;
  knownFor?: Array<FilmInfo>;
  category: "actor" | "director" | "other";
};

// TMDB API raw response shapes for /search/multi and /search/person.
// Canonical home per CODING_STANDARDS.md §2 (single source of truth,
// `type` not `interface`). The search converters in data/search.ts
// consume these.
export type TMDBMovieResult = {
  id: number;
  poster_path?: string;
  backdrop_path?: string;
  title: string;
  overview: string;
  vote_average: number;
  release_date?: string;
  genre_ids?: number[];
  media_type: "movie";
};

export type TMDBTVResult = {
  id: number;
  poster_path?: string;
  backdrop_path?: string;
  name: string;
  overview: string;
  vote_average: number;
  first_air_date?: string;
  genre_ids?: number[];
  media_type: "tv";
};

export type TMDBPersonResult = {
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
};

export type TMDBSearchItem =
  | TMDBMovieResult
  | TMDBTVResult
  | TMDBPersonResult;

export type TMDBSearchResponse = {
  page: number;
  results: TMDBSearchItem[];
  total_pages: number;
  total_results: number;
};

export type TMDBPersonSearchResponse = {
  page: number;
  results: TMDBPersonResult[];
  total_pages: number;
  total_results: number;
};

export type ActorSearchParams = {
  searchTerm?: string;
};

export const FILM_TYPE_QUERY_STRING = "type";

// New discriminated union for all content types
export type ContentItem =
  | (FilmInfo & { contentType: "movie" })
  | (FilmInfo & { contentType: "tv" })
  | (Person & { contentType: "person" });

export const RatingItems = [
  {
    value: 6,
    label: "6+",
  },
  {
    value: 7,
    label: "7+",
  },
  {
    value: 8,
    label: "8+",
  },
  {
    value: 9,
    label: "9+",
  },
];
