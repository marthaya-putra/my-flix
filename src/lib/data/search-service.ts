import { type ContentItem, type ContentType } from "@/lib/types";
import { searchActors, searchMovies, searchTVs } from "./search";

export interface SearchOptions {
  query: string;
  page: number;
}

/**
 * Generic search service that handles all content types
 */
export class SearchService {
  /**
   * Search content and handle pagination
   */
  static async search(
    type: ContentType,
    options: SearchOptions,
    currentItems: ContentItem[] | null = null,
  ): Promise<{
    items: ContentItem[];
    totalPages: number;
  }> {
    const { query, page } = options;

    let result: ContentItem[], totalPages;
    switch (type) {
      case "movie": {
        const movieResult = await searchMovies({ data: { query, page } });
        result = (movieResult.results || []).map((movie) => ({
          ...movie,
          contentType: "movie" as const,
        }));
        totalPages = movieResult.totalPages || 0;
        break;
      }

      case "tv": {
        const tvResult = await searchTVs({ data: { query, page } });
        result = (tvResult.results || []).map((tv) => ({
          ...tv,
          contentType: "tv" as const,
        }));
        totalPages = tvResult.totalPages || 0;
        break;
      }

      case "person": {
        const personResult = await searchActors({ data: { query, page } });
        result = (personResult.people || []).map((person) => ({
          ...person,
          contentType: "person" as const,
        }));
        totalPages = personResult.totalPages || 0;
        break;
      }

      default:
        throw new Error(`Unsupported search type: ${type}`);
    }

    // If it's the first page or no current items, replace all
    if (options.page === 1 || !currentItems) {
      return {
        items: result,
        totalPages,
      };
    }

    // For subsequent pages, append to existing items
    return {
      items: [...currentItems, ...result],
      totalPages,
    };
  }
}
