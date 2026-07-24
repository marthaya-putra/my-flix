import { useState } from "react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus } from "lucide-react";

import { PreferenceItem } from "./preference-item";
import { usePreferencesContext } from "./preferences-context";
import { fadeUpContainer, fadeUpItem } from "@/lib/motion";
import type { FilmInfoWithDbId, PersonWithDbId } from "@/lib/types/preferences";
import type { ContentItem } from "@/lib/types";

interface AllPreferencesPageProps {
  category: "movies" | "tvShows" | "people";
}

const ITEMS_PER_PAGE = 20;

export function AllPreferencesPage({ category }: AllPreferencesPageProps) {
  const { preferences, removePreference, openAdd } = usePreferencesContext();
  const [currentPage, setCurrentPage] = useState(1);

  const { items, type, title } = (() => {
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
    }
  })();

  const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE);

  const handleRemove = (id: number) => {
    removePreference(id, type);
    toast.info("Item has been removed from your preferences.");
  };

  const handleAdd = () => openAdd(type);

  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const convertToContentItem = (
    item: FilmInfoWithDbId | PersonWithDbId,
  ): ContentItem => {
    if ("knownFor" in item) {
      return { ...(item as PersonWithDbId), contentType: "person" };
    }
    const film = item as FilmInfoWithDbId;
    return {
      ...film,
      contentType: film.category === "tv" ? "tv" : "movie",
    };
  };

  return (
    <div>
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <CardTitle className="text-lg font-display tracking-tight">
              {title}{" "}
              <span className="text-muted-foreground font-normal">
                ({items.length})
              </span>
            </CardTitle>
            <Button onClick={handleAdd} size="sm" variant="outline">
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <EmptyState title={title} onAdd={handleAdd} type={type} />
          ) : (
            <>
              <motion.div
                variants={fadeUpContainer}
                initial="hidden"
                animate="show"
                className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3"
              >
                {paginatedItems.map((item) => (
                  <motion.div key={item.id} variants={fadeUpItem}>
                    <PreferenceItem
                      item={convertToContentItem(item)}
                      onRemove={() => handleRemove(item.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>

              {totalPages > 1 && (
                <div className="mt-8 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() =>
                            currentPage > 1 && setCurrentPage(currentPage - 1)
                          }
                          className={
                            currentPage === 1
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                        (page) => {
                          if (
                            page === 1 ||
                            page === totalPages ||
                            (page >= currentPage - 1 && page <= currentPage + 1)
                          ) {
                            return (
                              <PaginationItem key={page}>
                                <PaginationLink
                                  onClick={() => setCurrentPage(page)}
                                  isActive={page === currentPage}
                                  className="cursor-pointer"
                                >
                                  {page}
                                </PaginationLink>
                              </PaginationItem>
                            );
                          }
                          if (
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
                        },
                      )}

                      <PaginationItem>
                        <PaginationNext
                          onClick={() =>
                            currentPage < totalPages &&
                            setCurrentPage(currentPage + 1)
                          }
                          className={
                            currentPage === totalPages
                              ? "pointer-events-none opacity-50"
                              : "cursor-pointer"
                          }
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function EmptyState({
  title,
  type,
  onAdd,
}: {
  title: string;
  type: "movie" | "tv" | "person";
  onAdd: () => void;
}) {
  const addLabel =
    type === "movie"
      ? "Add Movie"
      : type === "tv"
        ? "Add TV Show"
        : "Add Person";
  const emptyLabel =
    type === "movie" ? "movies" : type === "tv" ? "TV shows" : "people";

  return (
    <div className="text-center py-14 border border-dashed border-muted rounded-lg flex flex-col items-center justify-center">
      <p className="text-sm text-muted-foreground mb-4">
        No {emptyLabel} added yet
      </p>
      <Button onClick={onAdd} size="sm">
        <Plus className="h-4 w-4" />
        {addLabel}
      </Button>
    </div>
  );
}
