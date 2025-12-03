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

export type MovieRouteSearchParams = {
  page?: number;
  genres?: string;
  rating?: number;
  year?: number;
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

// TMDB API specific types
export type TMDBMultiSearchResult = {
  page: number;
  results: Array<TMDBSearchItem>;
  total_pages: number;
  total_results: number;
};

export type TMDBSearchItem = (FilmInfo & { media_type: 'movie' | 'tv' }) | (Actor & { media_type: 'person' });

export type ActorSearchParams = {
  searchTerm?: string;
};

export const FILM_TYPE_QUERY_STRING = "type";

// New discriminated union for all content types
export type ContentItem =
  | (FilmInfo & { contentType: 'movie' })
  | (FilmInfo & { contentType: 'tv' })
  | (Person & { contentType: 'person' });

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
