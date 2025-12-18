import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from "@/components/ui/pagination";
import { Link } from "@tanstack/react-router";

import { toast } from "sonner";
import { Plus, ArrowLeft } from "lucide-react";
import { ContentSearchDialog } from "./content-search-dialog";
import { PreferenceItem } from "./preference-item";
import { usePreferences } from "./use-preferences";
import { UserPreferences } from "@/lib/types/preferences";

interface AllPreferencesPageProps {
  initialPreferences?: UserPreferences;
  category: "movies" | "tvShows" | "people";
}

const ITEMS_PER_PAGE = 20;

export function AllPreferencesPage({
  initialPreferences,
  category,
}: AllPreferencesPageProps) {
  const { preferences, addPreference, removePreference } =
    usePreferences(initialPreferences);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<"movie" | "tv" | "person">(
    "movie"
  );
  const [currentPage, setCurrentPage] = useState(1);

  const handleAddContent = () => {
    const type =
      category === "movies"
        ? "movie"
        : category === "tvShows"
          ? "tv"
          : "person";
    setSearchType(type);
    setIsSearchOpen(true);
  };

  const handleContentSelected = (content: any) => {
    addPreference(content);
    toast.success(
      `${content.title || content.name} has been added to your preferences.`
    );
  };

  const handleRemovePreference = (id: number) => {
    const type =
      category === "movies"
        ? "movie"
        : category === "tvShows"
          ? "tv"
          : "person";
    removePreference(id, type);
    toast.info("Item has been removed from your preferences.");
  };

  // Get current category data
  const getCurrentCategoryData = () => {
    switch (category) {
      case "movies":
        return {
          items: preferences.movies,
          type: "movie" as const,
          title: "Movies",
        };
      case "tvShows":
        return {
          items: preferences.tvShows,
          type: "tv" as const,
          title: "TV Shows",
        };
      case "people":
        return {
          items: preferences.people,
          type: "person" as const,
          title: "People",
        };
      default:
        return { items: [], type: "movie" as const, title: "" };
    }
  };

  const { items, type, title } = getCurrentCategoryData();

  const existingIds = new Set([
    ...preferences.movies.map((item: any) => item.id),
    ...preferences.tvShows.map((item: any) => item.id),
    ...preferences.people.map((item: any) => item.id),
  ]);

  // Calculate pagination
  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  console.log({ totalPages });

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-2">
          <Link to="/preferences">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Preferences
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">
            {title ? `All Your ${title}` : "All Your Preferences"}
          </h1>
        </div>
        <p className="text-muted-foreground">
          {title
            ? `Browse through all your saved ${title.toLowerCase()}`
            : "Complete overview of all your saved movies, TV shows, and people."}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>All Your {title}</CardTitle>
              <CardDescription>
                Browse through all your saved {title.toLowerCase()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PaginatedContentSection
                title={title}
                items={items}
                type={type}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
                onRemove={handleRemovePreference}
                onAdd={handleAddContent}
                showEmptyState={true}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ContentSearchDialog
        open={isSearchOpen}
        key={searchType}
        onOpenChange={setIsSearchOpen}
        searchType={searchType}
        onContentSelected={handleContentSelected}
        existingIds={existingIds}
      />
    </div>
  );
}

interface PaginatedContentSectionProps {
  title: string;
  items: any[];
  type: "movie" | "tv" | "person";
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRemove: (id: number) => void;
  onAdd: () => void;
  showEmptyState?: boolean;
}

function PaginatedContentSection({
  title,
  items,
  type,
  onRemove,
  onAdd,
  currentPage,
  totalPages,
  onPageChange,
  showEmptyState,
}: PaginatedContentSectionProps) {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const getAddButtonText = () => {
    switch (type) {
      case "movie":
        return "Add Movie";
      case "tv":
        return "Add TV Show";
      case "person":
        return "Add Person";
      default:
        return "Add";
    }
  };

  const getEmptyStateText = () => {
    switch (type) {
      case "movie":
        return "movies";
      case "tv":
        return "TV shows";
      case "person":
        return "people";
      default:
        return "items";
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">
          {title} ({items.length})
        </h3>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        showEmptyState && (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-4">
              No {getEmptyStateText()} added yet
            </p>
            <Button onClick={onAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {getAddButtonText()}
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
            {paginatedItems.map((item) => (
              <PreferenceItem
                key={item.id}
                item={item}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={() => currentPage > 1 && onPageChange(currentPage - 1)}
                      className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            onClick={() => onPageChange(page)}
                            isActive={page === currentPage}
                            className="cursor-pointer"
                          >
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <PaginationItem key={page}>
                          <PaginationEllipsis />
                        </PaginationItem>
                      );
                    }
                    return null;
                  })}

                  <PaginationItem>
                    <PaginationNext
                      onClick={() => currentPage < totalPages && onPageChange(currentPage + 1)}
                      className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </>
      )}
    </div>
  );
}
