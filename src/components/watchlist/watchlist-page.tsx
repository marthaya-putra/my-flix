import { Bookmark, Compass } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import MovieCard from "@/components/movie-card";
import { useWatchlist } from "@/hooks/use-watchlist";
import type { FilmInfo, FilmType } from "@/lib/types";
import type { UserWatchlist } from "@/lib/db";

interface WatchlistPageProps {
  items: UserWatchlist[];
}

/**
 * Convert a stored watchlist row into the `FilmInfo` shape `MovieCard`
 * expects. The rich row (stored in #27) carries title/year/category/genres/
 * posterPath; the `FilmInfo`-only fields the row doesn't carry (overview,
 * backdropPath, genreIds) are defaulted. `voteAverage` is left at 0 —
 * `MovieCard` hides its rating badge when there's no rating.
 */
function rowToFilmInfo(row: UserWatchlist): FilmInfo {
  return {
    id: row.watchListId,
    posterPath: row.posterPath ?? "",
    backdropPath: "",
    title: row.title,
    overview: "",
    // `MovieCard` renders `new Date(releaseDate).getFullYear()`; store a
    // valid ISO date so the year displays instead of NaN.
    releaseDate: `${row.year}-01-01`,
    voteAverage: 0,
    category: (row.category === "tv-series" ? "tv" : "movie") as FilmType,
    genreIds: [],
    genres: row.genres ? row.genres.split(",").map((g) => g.trim()).filter(Boolean) : [],
  };
}

export function WatchlistPage({ items }: WatchlistPageProps) {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();

  const description =
    items.length === 0
      ? "Movies and shows you've added to your Watchlist."
      : `${items.length} ${items.length === 1 ? "title" : "titles"} in your Watchlist.`;

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Watchlist</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center">
          <Bookmark className="h-10 w-10 text-muted-foreground/50 mb-4" />
          <p className="text-muted-foreground mb-4">
            Your Watchlist is empty. Browse titles and add them to your Watchlist to see them here.
          </p>
          <Button asChild>
            <Link to="/">
              <Compass className="h-4 w-4 mr-2" />
              Browse titles
            </Link>
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {items.map((row) => {
            const filmInfo = rowToFilmInfo(row);
            return (
              <MovieCard
                key={row.id}
                {...filmInfo}
                isWatchlisted={isWatchlisted(row.watchListId)}
                onToggleWatchlist={toggleWatchlist}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
