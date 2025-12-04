import { useState } from "react";
import { useDebouncedCallback } from "use-debounce";
import { match } from "ts-pattern";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Film, Tv, Users, Loader2 } from "lucide-react";
import { FilmInfo, Person, ContentItem } from "@/lib/types";
import { ContentType } from "@/lib/types";
import { getContentSubtitle } from "@/lib/utils";
import { SearchService } from "@/lib/data/search-service";
import { MovieCard, TVCard, PersonCard } from "@/components/ui/content-cards";

interface ContentSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  searchType: ContentType;
  onContentSelected: (content: ContentItem) => void;
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
  const [searchResponse, setSearchResponse] = useState<ContentItem[] | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [activeTab, setActiveTab] = useState(searchType);

  const debouncedSearch = useDebouncedCallback(async () => {
    if (query.length < 2) {
      setSearchResponse(null);
      return;
    }
    setIsLoading(true);
    try {
      const { items, totalPages } = await SearchService.search(
        activeTab,
        { query, page },
        searchResponse
      );

      setSearchResponse(items);
      setTotalPages(totalPages);
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

  const handleContentClick = (item: ContentItem) => {
    onContentSelected(item);
    // Don't close the dialog - allow multiple additions
  };

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
                    {searchResponse?.map((item) => (
                      <ContentCard
                        key={item.id}
                        item={item}
                        onSelect={(content) => handleContentClick(content)}
                        isAdded={existingIds.has(item.id)}
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

interface ContentCardProps {
  item: ContentItem;
  onSelect: (content: ContentItem) => void;
  isAdded?: boolean;
}

function ContentCard({ item, onSelect, isAdded = false }: ContentCardProps) {
  // Use pattern matching to render the appropriate card
  return match(item)
    .with({ contentType: "movie" }, (movie) => (
      <MovieCard
        movie={movie}
        onAdd={(movie) => onSelect({ ...movie, contentType: "movie" })}
        isAdded={isAdded}
      />
    ))
    .with({ contentType: "tv" }, (tv) => (
      <TVCard
        tvShow={tv}
        onAdd={() => onSelect({ ...tv, contentType: "tv" })}
        isAdded={isAdded}
      />
    ))
    .with({ contentType: "person" }, (person) => (
      <PersonCard
        person={person}
        onAdd={() => onSelect({ ...person, contentType: "person" })}
        isAdded={isAdded}
      />
    ))
    .otherwise(() => null);
}
