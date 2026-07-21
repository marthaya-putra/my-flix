import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bookmark, Compass } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import MovieCard from "@/components/movie-card";
import CustomPagination from "@/components/pagination";
import { useWatchlist } from "@/hooks/use-watchlist";
import { preferencesKeys } from "@/lib/queries/preferences";
import { WATCHLIST_PAGE_SIZE } from "@/lib/utils";
import type { FilmInfo, FilmType } from "@/lib/types";
import type { UserWatchlist } from "@/lib/db";
import type { Route as WatchlistRoute } from "@/routes/watchlist";

/** Shape of each cached /watchlist page (matches fetchUserWatchlist). */
type WatchlistPageData = {
  watchlist: UserWatchlist[];
  page: number;
  totalPages: number;
  totalItems: number;
};

interface WatchlistPageProps {
  route: typeof WatchlistRoute;
  page: number;
  totalPages: number;
  totalItems: number;
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

export function WatchlistPage({
  route,
  page,
  totalPages,
  totalItems,
  items,
}: WatchlistPageProps) {
  const { isWatchlisted, toggleWatchlist } = useWatchlist();
  const navigate = useNavigate({ from: route.id });
  const queryClient = useQueryClient();

  const description =
    totalItems === 0
      ? "Movies and shows you've added to your Watchlist."
      : `${totalItems} ${totalItems === 1 ? "title" : "titles"} in your Watchlist.`;

  const goToPage = (next: number) => {
    void navigate({ search: { page: next } });
  };

  // On /watchlist every card is already saved, so a toggle is always a
  // remove. We optimistically drop the row from the CURRENT page's cache so
  // the card vanishes instantly (the hook only optimistically flips the ids
  // cache — it doesn't touch the page-keyed rows cache). If the remove
  // empties this page, step back one page so the user lands on the previous
  // page instead of an empty grid. No explicit rollback: on error the hook's
  // onSettled invalidates the rows prefix and the server's authoritative
  // page replaces ours.
  const handleToggle = (filmInfo: FilmInfo) => {
    const isLastOnPage = items.length === 1;
    const cacheKey = [...preferencesKeys.userWatchlist(), page];
    const current = queryClient.getQueryData<WatchlistPageData>(cacheKey);
    if (current) {
      const watchlist = current.watchlist.filter(
        (row) => row.watchListId !== filmInfo.id,
      );
      const nextTotalItems = Math.max(current.totalItems - 1, 0);
      const nextTotalPages =
        nextTotalItems === 0
          ? 0
          : Math.ceil(nextTotalItems / WATCHLIST_PAGE_SIZE);
      queryClient.setQueryData<WatchlistPageData>(cacheKey, {
        ...current,
        watchlist,
        totalItems: nextTotalItems,
        totalPages: nextTotalPages,
      });
    }
    toggleWatchlist(filmInfo);
    if (isLastOnPage && page > 1) {
      void navigate({ search: { page: page - 1 } });
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Watchlist</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {totalItems === 0 ? (
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
        <>
          <CustomPagination
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={page < totalPages}
            hasPreviousPage={page > 1}
            onPrevPage={() => goToPage(page - 1)}
            onNextPage={() => goToPage(page + 1)}
          />

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 my-8">
            {items.map((row) => {
              const filmInfo = rowToFilmInfo(row);
              return (
                <MovieCard
                  key={row.id}
                  {...filmInfo}
                  isWatchlisted={isWatchlisted(row.watchListId)}
                  onToggleWatchlist={handleToggle}
                />
              );
            })}
          </div>

          <CustomPagination
            currentPage={page}
            totalPages={totalPages}
            hasNextPage={page < totalPages}
            hasPreviousPage={page > 1}
            onPrevPage={() => goToPage(page - 1)}
            onNextPage={() => goToPage(page + 1)}
          />
        </>
      )}
    </div>
  );
}
