import { Link } from "@tanstack/react-router";
import { Film, Search, Tv, User, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { FrostEmptyState } from "@/components/frost-empty-state";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { searchContent } from "@/lib/data/search";
import { SearchResult } from "@/lib/types";
import { Card } from "./card";
import { PlayLink } from "./play-link";

type SearchModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchContent({ data: { query } });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const debouncedSearch = useDebouncedCallback(performSearch, 300);

  const movies = searchResults?.movies.slice(0, 5) || [];
  const tvShows = searchResults?.tvShows.slice(0, 5) || [];
  const people = searchResults?.people.slice(0, 5) || [];

  const hasMoreMovies = (searchResults?.movies.length || 0) > 5;
  const hasMoreTvShows = (searchResults?.tvShows.length || 0) > 5;
  const hasMorePeople = (searchResults?.people.length || 0) > 5;

  const handleMoreClick = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[75vh] flex flex-col bg-popover border-border">
        <DialogClose className="absolute right-4 top-4 rounded-full bg-black/60 backdrop-blur-sm border border-border p-2 text-white hover:bg-black/80 transition-colors z-10">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogHeader className=" pb-4 pt-2">
          <DialogTitle className="sr-only">
            Search Movies, TV Shows, and People
          </DialogTitle>
          <div className="flex items-center gap-4 pr-14">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-5 h-5 pointer-events-none" />
              <Input
                placeholder="Search by title or person..."
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  const query = e.target.value;
                  setSearchQuery(query);
                  debouncedSearch(query);
                }}
                className="pl-12 pr-4 py-3 bg-muted border-input text-foreground placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:border-ring rounded-full h-12 text-base w-full"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Searching...</div>
            </div>
          )}

          {!isLoading && !searchQuery && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Search by title or person</p>
            </div>
          )}

          {!isLoading && searchQuery && (
            <div className="space-y-3 h-full">
              {movies.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-start">
                    {movies.map((movie) => (
                      <PlayLink
                        key={`movie-${movie.id}`}
                        title={movie.title}
                        category={movie.category}
                      >
                        <Card
                          imageUrl={movie.posterPath}
                          title={movie.title}
                          subtitle={movie.releaseDate?.split("-")[0]}
                          badge={
                            <div className="bg-chart-1/90 backdrop-blur-sm p-2 rounded-full">
                              <Film className="w-3 h-3 text-white" />
                            </div>
                          }
                        />
                      </PlayLink>
                    ))}
                    {hasMoreMovies && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/movies/search"
                          search={{ query: searchQuery }}
                          className="text-sm text-chart-1 hover:text-chart-1/80 transition-colors font-medium"
                          onClick={handleMoreClick}
                        >
                          More →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TV Shows Row */}
              {tvShows.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-start">
                    {tvShows.map((tvShow) => (
                      <PlayLink
                        key={`tv-${tvShow.id}`}
                        title={tvShow.title}
                        category={tvShow.category}
                      >
                        <Card
                          imageUrl={tvShow.posterPath}
                          title={tvShow.title}
                          subtitle={tvShow.releaseDate?.split("-")[0]}
                          badge={
                            <div className="bg-chart-2/90 backdrop-blur-sm p-2 rounded-full">
                              <Tv className="w-3 h-3 text-white" />
                            </div>
                          }
                        />
                      </PlayLink>
                    ))}
                    {hasMoreTvShows && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/tvs/search"
                          search={{ query: searchQuery }}
                          className="text-sm text-chart-2 hover:text-chart-2/80 transition-colors font-medium"
                          onClick={handleMoreClick}
                        >
                          More →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* People Row */}
              {people.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 items-start">
                    {people.map((person) => (
                      <Card
                        key={`person-${person.id}`}
                        imageUrl={person.profileImageUrl}
                        title={person.name}
                        badge={
                          <div className="bg-chart-4/90 backdrop-blur-sm p-2 rounded-full">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        }
                      />
                    ))}
                    {hasMorePeople && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/person/search"
                          search={{ query: searchQuery }}
                          className="text-sm text-chart-4 hover:text-chart-4/80 transition-colors font-medium"
                          onClick={handleMoreClick}
                        >
                          More →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* No Results */}
              {movies.length === 0 &&
                tvShows.length === 0 &&
                people.length === 0 && (
                  <FrostEmptyState>
                    {/* Canvas UI Frost — Issue #67: static ambient frost
                        pane behind the message. See frost-empty-state. */}
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <Search className="w-16 h-16 mb-4 opacity-50" />
                      <p className="text-lg">No results found</p>
                      <p className="text-sm mt-2">Try different keywords</p>
                    </div>
                  </FrostEmptyState>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
