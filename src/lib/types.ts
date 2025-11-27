export type FilmType = "movie" | "tv";
export type Genre = {
  id: number;
  name: string;
};
export type MovieSearchParam = {
  type?: FilmType;
  genres?: string;
  rating?: string;
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
};

export type DiscoverResult = {
  page: number;
  results: Array<FilmInfo>;
  totalPages: number;
};

export type Person = {
  id: number;
  name: string;
  profileImageUrl: string;
  popularity: number;
  imdbId?: string;
  biography?: string;
};

export type ActorSearchParams = {
  searchTerm?: string;
};

export const FILM_TYPE_QUERY_STRING = "type";

export const RatingItems = [
  {
    value: "6",
    label: "6+",
  },
  {
    value: "7",
    label: "7+",
  },
  {
    value: "8",
    label: "8+",
  },
  {
    value: "9",
    label: "9+",
  },
];
