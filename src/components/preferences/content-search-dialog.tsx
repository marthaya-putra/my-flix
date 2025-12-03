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
import { FilmInfo, Person } from "@/lib/types";
import { searchMovies, searchTVs, searchActors } from "@/lib/data/search";
import {
  BaseContentItem,
  ContentType,
  getContentSubtitle,
  transformMultiSearchResults,
} from "@/lib/data/search-abstraction";

interface ContentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchType: ContentType;
  onContentSelected: (content: FilmInfo | Person) => void;
  existingIds?: Set<number>;
}

const tabIcons = {
  movie: <Film className="h-5 w-5" />,
  tv: <Tv className="h-5 w-5" />,
  person: <Users className="h-5 w-5" />,
};

export function ContentSearchDialog({
  open,
  onOpenChange,
  searchType,
  onContentSelected,
  existingIds = new Set(),
}: ContentSearchDialogProps) {
  const [query, setQuery] = useState("");
  const [searchResponse, setSearchResponse] = useState<BaseContentItem[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState(searchType);

  const debouncedSearch = useDebouncedCallback(async () => {
    if (query.length < 2) {
      setSearchResponse(null);
      return;
    }
    // Perform actual search here
    setIsLoading(true);
    try {
      if (activeTab === 'movie') {
        const movieResult = await searchMovies({ data: { query, page } });
        if (page === 1) {
          setSearchResponse(movieResult.results || []);
        } else {
          setSearchResponse(prev => [...(prev || []), ...(movieResult.results || [])]);
        }
        setTotalPages(movieResult.totalPages || 0);
      } else if (activeTab === 'tv') {
        const tvResult = await searchTVs({ data: { query, page } });
        if (page === 1) {
          setSearchResponse(tvResult.results || []);
        } else {
          setSearchResponse(prev => [...(prev || []), ...(tvResult.results || [])]);
        }
        setTotalPages(tvResult.totalPages || 0);
      } else if (activeTab === 'person') {
        const personResult = await searchActors({ data: { query, page } });
        if (page === 1) {
          setSearchResponse(personResult.people || []);
        } else {
          setSearchResponse(prev => [...(prev || []), ...(personResult.people || [])]);
        }
        setTotalPages(personResult.totalPages || 0);
      }
    } catch (error) {
      console.error("Search error:", error);
      setSearchResponse(null);
    } finally {
      setIsLoading(false);
    }
  }, 300);

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setQuery("");
      setSearchResponse(null);
      setPage(1);
      setActiveTab(searchType);
    }
    onOpenChange(newOpen);
  };

  const handleLoadMore = () => {
    if (!isLoading && page < totalPages) {
      setPage((prev) => prev + 1);
      setTimeout(() => debouncedSearch(), 0);
    }
  };

  const handleContentClick = (item: BaseContentItem) => {
    // Convert BaseContentItem back to proper type
    if (activeTab === 'movie' || activeTab === 'tv') {
      onContentSelected(item as FilmInfo);
    } else {
      onContentSelected(item as Person);
    }
    // Don't close the dialog - allow multiple additions
  };

  const getImageUrl = (item: BaseContentItem) => item.imageUrl;
  const getTitle = (item: BaseContentItem) => item.title;
  const getSubtitle = (item: BaseContentItem) => item.subtitle;
  const getRating = (item: BaseContentItem) => item.rating;
  const getGenres = (item: BaseContentItem) => item.genres;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {tabIcons[activeTab] || tabIcons.movie}
            Search {getContentSubtitle(activeTab)}s
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
                placeholder={`Search ${getContentSubtitle(activeTab).toLowerCase()}s...`}
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
                setSearchResponse(null);
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
              ) : isLoading && !searchResponse ? (
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
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                    {searchResponse
                      ?.filter((item) => !existingIds.has(item.id))
                      .map((item) => (
                        <SearchResultCard
                          key={item.id}
                          item={item}
                          type={activeTab}
                          onSelect={() => handleContentClick(item)}
                        />
                      ))}
                  </div>

                  {page < totalPages && (
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
              )}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SearchResultCardProps {
  item: BaseContentItem;
  type: ContentType;
  onSelect: () => void;
}

function SearchResultCard({ item, type, onSelect }: SearchResultCardProps) {
  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow group h-fit"
      onClick={onSelect}
    >
      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Image */}
          <div className="shrink-0">
            {getImageUrl(item) ? (
              <img
                src={getImageUrl(item)}
                alt={getTitle(item)}
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
                  {getTitle(item)}
                </h3>
                {getSubtitle(item) && (
                  <p className="text-xs text-muted-foreground">{getSubtitle(item)}</p>
                )}
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
              {getRating(item) && (
                <div className="flex items-center gap-1">
                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                  <span className="text-xs">{getRating(item)!.toFixed(1)}</span>
                </div>
              )}
              {getSubtitle(item) && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{getSubtitle(item)}</span>
                </div>
              )}
            </div>

            {/* Genres */}
            {getGenres(item).length > 0 && (
              <div className="flex flex-wrap gap-1">
                {getGenres(item).slice(0, 2).map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5"
                  >
                    {genre}
                  </Badge>
                ))}
                {getGenres(item).length > 2 && (
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                    +{getGenres(item).length - 2}
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