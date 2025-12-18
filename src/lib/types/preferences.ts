import { FilmInfo, Person } from "@/lib/types";

// Extended FilmInfo type that includes dbId from database
export type FilmInfoWithDbId = FilmInfo & {
  dbId?: number;
};

// Extended Person type that includes dbId from database
export type PersonWithDbId = Person & {
  dbId?: number;
};

// Unified UserPreferences type - matches fetchUserPreferences return
export interface UserPreferences {
  movies: FilmInfoWithDbId[];
  tvShows: FilmInfoWithDbId[];
  people: PersonWithDbId[];
  favoriteGenres: string[];
  minRating: number;
  preferredContent: {
    movie: boolean;
    tv: boolean;
  };
  notes: string;
}