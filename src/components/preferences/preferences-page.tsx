import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus, Heart, ArrowRight } from "lucide-react";

import { PreferenceItem } from "./preference-item";
import { usePreferencesContext } from "./preferences-context";
import { fadeUpContainer, fadeUpItem } from "@/lib/motion";
import { FilmInfoWithDbId, PersonWithDbId } from "@/lib/types/preferences";
import { ContentItem } from "@/lib/types";

export function PreferencesPage() {
  const { preferences, removePreference, openAdd } = usePreferencesContext();

  const handleRemove = (id: number, type: "movie" | "tv" | "person") => {
    removePreference(id, type);
    toast.info("Item has been removed from your preferences.");
  };

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

  const isEmpty =
    preferences.movies.length === 0 &&
    preferences.tvShows.length === 0 &&
    preferences.people.length === 0;

  return (
    <div className="space-y-8">
      {isEmpty ? (
        <EmptyHero onAdd={openAdd} />
      ) : (
        <>
          {preferences.movies.length > 0 && (
            <FavoriteSection
              title="Movies"
              items={preferences.movies.map(convertToContentItem)}
              type="movie"
              onRemove={(id) => handleRemove(id, "movie")}
              onAdd={() => openAdd("movie")}
              limit={5}
            />
          )}
          {preferences.tvShows.length > 0 && (
            <FavoriteSection
              title="TV Shows"
              items={preferences.tvShows.map(convertToContentItem)}
              type="tv"
              onRemove={(id) => handleRemove(id, "tv")}
              onAdd={() => openAdd("tv")}
              limit={5}
            />
          )}
          {preferences.people.length > 0 && (
            <FavoriteSection
              title="People"
              items={preferences.people.map(convertToContentItem)}
              type="person"
              onRemove={(id) => handleRemove(id, "person")}
              onAdd={() => openAdd("person")}
              limit={5}
            />
          )}
        </>
      )}
    </div>
  );
}

interface FavoriteSectionProps {
  title: string;
  items: ContentItem[];
  type: "movie" | "tv" | "person";
  onRemove: (id: number) => void;
  onAdd?: () => void;
  limit?: number;
}

function FavoriteSection({
  title,
  items,
  type,
  onRemove,
  onAdd,
  limit,
}: FavoriteSectionProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const hasMore = limit !== undefined && items.length > limit;

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold font-display tracking-tight">
          {title}
        </h2>
        {onAdd && (
          <Button onClick={onAdd} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      <motion.div
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
      >
        {displayItems.map((item) => (
          <motion.div key={item.id} variants={fadeUpItem}>
            <PreferenceItem item={item} onRemove={() => onRemove(item.id)} />
          </motion.div>
        ))}
      </motion.div>

      {hasMore && (
        <div className="mt-4 flex justify-center">
          <Button asChild variant="link" size="sm" className="text-sm gap-1">
            <Link to={`/preferences/${type}`}>
              Show all {items.length} {title.toLowerCase()}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      )}
    </section>
  );
}

function EmptyHero({
  onAdd,
}: {
  onAdd?: (type: "movie" | "tv" | "person") => void;
}) {
  const actions: { type: "movie" | "tv" | "person"; label: string }[] = [
    { type: "movie", label: "Add Movies" },
    { type: "tv", label: "Add TV Shows" },
    { type: "person", label: "Add People" },
  ];
  return (
    <div className="text-center py-14">
      <div className="inline-flex items-center justify-center h-14 w-14 rounded-full bg-primary/10 mb-4">
        <Heart className="h-7 w-7 text-primary" />
      </div>
      <p className="text-base font-medium mb-1">No favorites yet</p>
      <p className="text-sm text-muted-foreground mb-5">
        Start adding what you love to personalize your recommendations.
      </p>
      <div className="flex flex-wrap gap-2 justify-center">
        {actions.map((action) => (
          <Button
            key={action.type}
            onClick={() => onAdd?.(action.type)}
            variant="outline"
          >
            <Plus className="h-4 w-4" />
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
