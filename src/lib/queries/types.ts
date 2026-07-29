/**
 * Shared arg shapes for query factories. Bundling these stops the same
 * fields from being redeclared as inline type literals across every
 * keys/options/route site (Data Clump).
 */

/** Filters shared by movie + TV discover listing routes. */
export type DiscoverFilters = {
  page: number;
  genres: string;
  rating?: number;
  year?: number;
};

/** Args for a paginated text search (movies / tvs / people). */
export type SearchArgs = {
  query: string;
  page: number;
};
