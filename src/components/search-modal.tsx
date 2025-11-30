import { Search, Film, Tv, User, X } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useDebounce } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import { SearchResult, FilmInfo, Actor } from "@/lib/types";
import { Link } from "@tanstack/react-router";
import Card from "./card";
import { PlayLink } from "./play-link";
import { searchContent } from "@/lib/data/search";

interface SearchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function SearchModal({ open, onOpenChange }: SearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery] = useDebounce(searchQuery, 300);
  const [searchResults, setSearchResults] = useState<SearchResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  
  // Reset states when modal closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setSearchResults(null);
      setIsLoading(false);
    }
  }, [open]);

  const performSearch = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const results = await searchContent({ data: query });
      setSearchResults(results);
    } catch (error) {
      console.error("Search failed:", error);
      setSearchResults(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    performSearch(debouncedSearchQuery);
  }, [debouncedSearchQuery, performSearch]);

  const movies = searchResults?.movies.slice(0, 5) || [];
  const tvShows = searchResults?.tvShows.slice(0, 5) || [];
  const actors = searchResults?.actors.slice(0, 5) || [];

  const hasMoreMovies = (searchResults?.movies.length || 0) > 5;
  const hasMoreTvShows = (searchResults?.tvShows.length || 0) > 5;
  const hasMoreActors = (searchResults?.actors.length || 0) > 5;

  const handleMoreClick = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl w-[90vw] h-[75vh] flex flex-col bg-black/95 border-gray-800">
        <DialogClose className="absolute right-4 top-4 rounded-full bg-black/60 backdrop-blur-sm border border-gray-600 p-2 text-white hover:bg-black/80 transition-colors z-10">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogClose>

        <DialogHeader className=" pb-4 pt-2">
          <DialogTitle className="sr-only">
            Search Movies, TV Shows, and Actors
          </DialogTitle>
          <div className="flex items-center gap-4 pr-14">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
              <Input
                ref={inputRef}
                autoFocus
                placeholder="Search by title or actor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 py-3 bg-gray-900/50 border-gray-700 text-white placeholder-gray-400 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:border-blue-500 rounded-full h-12 text-base w-full"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="overflow-y-auto flex-1">
          {isLoading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-gray-400">Searching...</div>
            </div>
          )}

          {!isLoading && !searchQuery && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Search className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-lg">Search by title or actor</p>
            </div>
          )}

          {!isLoading && searchQuery && (
            <div className="space-y-3 h-full">
              {movies.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                            <div className="bg-blue-500/90 backdrop-blur-sm p-2 rounded-full">
                              <Film className="w-3 h-3 text-white" />
                            </div>
                          }
                        />
                      </PlayLink>
                    ))}
                    {hasMoreMovies && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/movies-search"
                          search={{ query: searchQuery }}
                          className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-medium"
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
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
                            <div className="bg-green-500/90 backdrop-blur-sm p-2 rounded-full">
                              <Tv className="w-3 h-3 text-white" />
                            </div>
                          }
                        />
                      </PlayLink>
                    ))}
                    {hasMoreTvShows && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/tvs-search"
                          search={{ query: searchQuery }}
                          className="text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
                          onClick={handleMoreClick}
                        >
                          More →
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actors Row */}
              {actors.length > 0 && (
                <div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                    {actors.map((actor) => (
                      <Card
                        key={`actor-${actor.id}`}
                        imageUrl={actor.profileImageUrl}
                        title={actor.name}
                        badge={
                          <div className="bg-purple-500/90 backdrop-blur-sm p-2 rounded-full">
                            <User className="w-3 h-3 text-white" />
                          </div>
                        }
                      />
                    ))}
                    {hasMoreActors && (
                      <div className="flex items-center justify-center">
                        <Link
                          to="/actors-search"
                          search={{ query: searchQuery }}
                          className="text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
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
                actors.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <Search className="w-16 h-16 mb-4 opacity-50" />
                    <p className="text-lg">No results found</p>
                    <p className="text-sm mt-2">Try different keywords</p>
                  </div>
                )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
