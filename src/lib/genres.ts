// Single source of truth for TMDB genre id → label maps.
// Consumed by the discover/search converters (utils.ts, search.ts) and
// by the genre filter UI (filters.tsx, genre-filter.tsx, tv-genre-filter.tsx).

export const MOVIE_GENRES: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const TV_GENRES: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

/**
 * Map TMDB genre ids to labels, dropping any ids absent from the map.
 * Single home for the id→label lookup so the discover and search
 * converters don't drift apart.
 */
export function genreLabels(
  ids: number[] | undefined,
  map: Record<number, string>,
): string[] {
  return Array.isArray(ids)
    ? ids.map((g) => map[g]).filter((g): g is string => !!g)
    : [];
}
