import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import {
  Search,
  Plus,
  Star,
  Calendar,
  Film,
  Tv,
  Users,
  Loader2,
} from "lucide-react";
import { searchMovies, searchTVs, searchActors } from "@/lib/data/search";
import { FilmInfo, Person, DiscoverResult } from "@/lib/types";

interface ContentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchType: "movie" | "tv" | "person";
  onContentSelected: (content: FilmInfo | Person) => void;
  existingIds?: Set<number>;
}

export function ContentSearchDialog({
  open,
  onOpenChange,
  searchType,
  onContentSelected,
  existingIds = new Set(),
}: ContentSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState(searchType);

  console.log({ activeTab });

  const debouncedSearch = useDebouncedCallback(() => {
    if (query.length < 2) {
      setResults(null);
      return;
    }
    handleSearch();
  }, 300);

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setQuery("");
      setResults(null);
      setPage(1);
      setActiveTab(searchType);
    }
    onOpenChange(newOpen);
  };

  const handleSearch = async () => {
    if (query.length < 2) return;

    setIsLoading(true);
    try {
      let searchResults:
        | DiscoverResult
        | { page: number; people: Array<Person>; totalPages: number };

      if (activeTab === "movie") {
        searchResults = await searchMovies({ data: { query, page } });
      } else if (activeTab === "tv") {
        searchResults = await searchTVs({ data: { query, page } });
      } else {
        searchResults = await searchActors({ data: { query, page } });
      }

      if (page === 1) {
        setResults(searchResults);
      } else {
        setResults((prev: any) => {
          if (activeTab === "person") {
            return {
              ...searchResults,
              people: [
                ...(prev?.people || []),
                ...(searchResults as any).people,
              ],
            };
          } else {
            const movieResults = searchResults as DiscoverResult;
            return {
              ...(searchResults as DiscoverResult),
              results: [...(prev?.results || []), ...movieResults.results],
            };
          }
        });
      }
    } catch (error) {
      console.error("Search error:", error);
      setResults(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadMore = () => {
    if (results && !isLoading && page < results.totalPages) {
      setPage((prev) => prev + 1);
      // Trigger search for the next page
      setTimeout(() => debouncedSearch(), 0);
    }
  };

  const handleContentClick = (content: FilmInfo | Person) => {
    onContentSelected(content);
    // Don't close the dialog - allow multiple additions
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {activeTab === "movie" && <Film className="h-5 w-5" />}
            {activeTab === "tv" && <Tv className="h-5 w-5" />}
            {activeTab === "person" && <Users className="h-5 w-5" />}
            Search{" "}
            {activeTab === "movie"
              ? "Movies"
              : activeTab === "tv"
                ? "TV Shows"
                : "People"}
          </DialogTitle>
          <DialogDescription>
            Find and add your favorite content to your preferences
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col h-[600px]">
          {/* Search Input */}
          <div className="space-y-4 pb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={`Search ${activeTab === "movie" ? "movies" : activeTab === "tv" ? "TV shows" : "people"}...`}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  debouncedSearch();
                }}
                className="pl-10"
              />
            </div>

            {/* Tab Navigation for Multi-Search */}
            <Tabs
              value={activeTab}
              onValueChange={(value) => {
                setActiveTab(value as any);
                setPage(1);
                setResults(null);
                if (query.length >= 2) {
                  debouncedSearch();
                }
              }}
            >
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="movie" className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  Movies
                </TabsTrigger>
                <TabsTrigger value="tv" className="flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  TV Shows
                </TabsTrigger>
                <TabsTrigger value="person" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  People
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator />

          {/* Results */}
          <ScrollArea className="flex-1">
            <div>
              {query.length < 2 ? (
                <div className="flex items-center justify-center h-64 text-center">
                  <div>
                    <Search className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Type at least 2 characters to start searching
                    </p>
                  </div>
                </div>
              ) : isLoading && !results ? (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <Card key={i}>
                        <CardContent className="flex items-center gap-4 p-4">
                          <Skeleton className="w-16 h-24 rounded" />
                          <div className="flex-1 space-y-2">
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-3 w-1/2" />
                            <Skeleton className="h-3 w-1/3" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ) : (
                results && (
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                      {(activeTab === "person"
                        ? results.people
                        : results.results
                      )
                        ?.filter((item: any) => !existingIds.has(item.id))
                        .map((item: any) => (
                          <SearchResultCard
                            key={item.id}
                            item={item}
                            type={activeTab}
                            onSelect={() => handleContentClick(item)}
                          />
                        ))}
                    </div>

                    {results.page < results.totalPages && (
                      <div className="flex justify-center mt-6">
                        <Button
                          onClick={handleLoadMore}
                          disabled={isLoading}
                          variant="outline"
                        >
                          {isLoading ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : null}
                          Load More
                        </Button>
                      </div>
                    )}
                  </div>
                )
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultCardProps {
  item: FilmInfo | Person;
  type: "movie" | "tv" | "person";
  onSelect: () => void;
}

function SearchResultCard({ item, type, onSelect }: SearchResultCardProps) {
  const getDisplayInfo = () => {
    if (type === "person") {
      const person = item as Person;
      return {
        title: person.name,
        subtitle: "Person",
        rating: null,
        date: null,
        imageUrl: person.profileImageUrl,
        genres: [],
      };
    } else {
      const film = item as FilmInfo;
      return {
        title: film.title,
        subtitle: film.category === "movie" ? "Movie" : "TV Show",
        rating: film.voteAverage,
        date: film.releaseDate?.split("-")[0] || null,
        imageUrl: film.posterPath,
        genres: film.genres,
      };
    }
  };

  const info = getDisplayInfo();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group h-fit"
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Image */}
          <div className="shrink-0">
            {info.imageUrl ? (
              <img
                src={info.imageUrl}
                alt={info.title}
                className="w-16 h-24 object-cover rounded"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-24 bg-muted rounded flex items-center justify-center">
                {type === "person" ? (
                  <Users className="h-6 w-6 text-muted-foreground" />
                ) : (
                  <Film className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 flex flex-col h-24 justify-between">
            <div className="flex items-start justify-between">
              <div className="min-w-0 flex-1">
                <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate leading-tight">
                  {info.title}
                </h3>
                <p className="text-xs text-muted-foreground">{info.subtitle}</p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="shrink-0 ml-2 h-8 w-8 p-0"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {/* Metadata */}
            <div className="flex items-center gap-2">
              {info.rating && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs">{info.rating.toFixed(1)}</span>
                </div>
              )}
              {info.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{info.date}</span>
                </div>
              )}
            </div>

            
            {/* Genres */}
            {info.genres && info.genres.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {info.genres.slice(0, 2).map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5"
                  >
                    {genre}
                  </Badge>
                ))}
                {info.genres.length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    +{info.genres.length - 2}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
