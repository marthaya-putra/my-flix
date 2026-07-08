import type { FilmInfo } from "@/lib/types";

// Sentinel streaming protocol (Specs 0004 + 0006). groupStart fires per
// category up front so the client can render skeletons; items interleave as
// TMDB resolves; groupEnd fires exactly once per category on termination
// with a status the client uses to decide between content / error card.
//
// Isolated into its own module so the client can import the type without
// pulling server-only runtime code (ai-sdk, postgres, better-auth) into the
// browser bundle — that was causing `Buffer is not defined`.
export type StreamCategory = "movie" | "tv";
export type StreamStatus =
  | "ok"
  | "generation_failed"
  | "exhausted"
  | "enrichment_empty";

export type StreamEvent =
  | { type: "groupStart"; category: StreamCategory }
  | {
      type: "item";
      rec: {
        title: string;
        category: StreamCategory;
        releasedYear: number;
        reason: string;
        imdbRating: number;
        tmdbData: FilmInfo;
      };
    }
  | {
      type: "groupEnd";
      category: StreamCategory;
      status: StreamStatus;
      error?: string;
    };
