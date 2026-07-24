import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { LayoutGrid, Film, Tv, Users, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ContentSearchDialog } from "./content-search-dialog";
import { usePreferences } from "./use-preferences";
import {
  PreferencesContext,
  type PreferencesContextValue,
} from "./preferences-context";
import { fadeUpContainer, fadeUpItem } from "@/lib/motion";
import { UserPreferences } from "@/lib/types/preferences";
import { ContentItem, FilmInfo, Person } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PreferencesShellProps {
  initialPreferences?: UserPreferences;
  children: ReactNode;
}

const NAV_ITEMS = [
  {
    to: "/preferences" as const,
    label: "Home",
    icon: LayoutGrid,
    exact: true,
  },
  { to: "/preferences/movie" as const, label: "Movies", icon: Film },
  { to: "/preferences/tv" as const, label: "TV Shows", icon: Tv },
  { to: "/preferences/person" as const, label: "People", icon: Users },
] as const;

/**
 * Persistent shell for the whole /preferences section: header, sticky
 * segmented sub-nav, global Add CTA, and the single shared preferences store
 * (exposed via context so every child page reads the same state). Child
 * routes render into `children` (the layout route's <Outlet />).
 */
export function PreferencesShell({
  initialPreferences,
  children,
}: PreferencesShellProps) {
  const store = usePreferences(initialPreferences);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<"movie" | "tv" | "person">(
    "movie",
  );

  const openAdd: PreferencesContextValue["openAdd"] = (type = "movie") => {
    setSearchType(type);
    setIsSearchOpen(true);
  };

  const handleContentSelected = (content: ContentItem) => {
    if (content.contentType === "person") {
      const person: Person = {
        id: content.id,
        name: content.name,
        profileImageUrl: content.profileImageUrl,
        popularity: content.popularity,
        imdbId: content.imdbId,
        biography: content.biography,
        knownFor: content.knownFor,
        category: content.category,
      };
      store.addPreference(person);
      toast.success(`${content.name} has been added to your preferences.`);
    } else {
      const film: FilmInfo = {
        id: content.id,
        posterPath: content.posterPath,
        backdropPath: content.backdropPath,
        title: content.title,
        overview: content.overview,
        voteAverage: content.voteAverage,
        releaseDate: content.releaseDate,
        category: content.contentType === "movie" ? "movie" : "tv",
        genreIds: content.genreIds,
        genres: content.genres,
      };
      store.addPreference(film);
      toast.success(`${content.title} has been added to your preferences.`);
    }
  };

  const existingIds = new Set([
    ...store.preferences.movies.map((item) => item.id),
    ...store.preferences.tvShows.map((item) => item.id),
    ...store.preferences.people.map((item) => item.id),
  ]);

  return (
    <PreferencesContext.Provider value={{ ...store, openAdd }}>
      <motion.div
        variants={fadeUpContainer}
        initial="hidden"
        animate="show"
        className="container mx-auto px-4 max-w-6xl"
      >
        {/* Header */}
        <motion.div variants={fadeUpItem} className="pt-8 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold font-display tracking-tight">
                Preferences
              </h1>
              <p className="text-muted-foreground mt-1.5">
                Shape your recommendations by adding what you love.
              </p>
            </div>
            <Button
              onClick={() => openAdd("movie")}
              className="self-start sm:self-auto"
            >
              <Plus className="h-4 w-4" />
              Add
            </Button>
          </div>
        </motion.div>

        {/* Sticky segmented sub-nav */}
        <motion.div
          variants={fadeUpItem}
          className="sticky top-[72px] z-20 -mx-4 px-4 pb-1"
        >
          <div className="glass rounded-xl p-1 flex items-center gap-1 overflow-x-auto hide-scrollbar">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex-1 min-w-fit"
                activeOptions={{ exact: item.exact }}
              >
                {({ isActive }) => (
                  <NavTrigger
                    active={isActive}
                    label={item.label}
                    icon={item.icon}
                  />
                )}
              </Link>
            ))}
          </div>
        </motion.div>

        {/* Child content */}
        <motion.div variants={fadeUpItem} className="pt-8 pb-16">
          {children}
        </motion.div>

        <ContentSearchDialog
          open={isSearchOpen}
          key={searchType}
          onOpenChange={setIsSearchOpen}
          searchType={searchType}
          onContentSelected={handleContentSelected}
          existingIds={existingIds}
        />
      </motion.div>
    </PreferencesContext.Provider>
  );
}

function NavTrigger({
  active,
  label,
  icon: Icon,
}: {
  active: boolean;
  label: string;
  icon: typeof Film;
}) {
  return (
    <div
      className={cn(
        "relative flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-[background-color,color] duration-200",
        active
          ? "bg-primary/15 text-primary"
          : "text-muted-foreground hover:text-foreground hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </div>
  );
}
