import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Film, Tv, Users, Plus, Star, Heart, ArrowRight } from "lucide-react";

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

  return (
    <div className="space-y-8">
      {/* Profile + stats dashboard */}
      <ProfilePanel />

      {/* Favorites */}
      <motion.div variants={fadeUpItem}>
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-lg font-display tracking-tight">
              Your Favorites
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="movies" className="flex items-center gap-2">
                  <Film className="h-4 w-4" />
                  <span className="hidden sm:inline">Movies</span>
                </TabsTrigger>
                <TabsTrigger value="tv" className="flex items-center gap-2">
                  <Tv className="h-4 w-4" />
                  <span className="hidden sm:inline">TV</span>
                </TabsTrigger>
                <TabsTrigger value="people" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span className="hidden sm:inline">People</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="space-y-8">
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
                  {preferences.movies.length === 0 &&
                    preferences.tvShows.length === 0 &&
                    preferences.people.length === 0 && (
                      <EmptyHero onAdd={openAdd} />
                    )}
                </div>
              </TabsContent>

              {(
                [
                  ["movies", "Movies", "movie"],
                  ["tv", "TV Shows", "tv"],
                  ["people", "People", "person"],
                ] as const
              ).map(([tab, title, type]) => {
                const section =
                  tab === "movies"
                    ? preferences.movies
                    : tab === "tv"
                      ? preferences.tvShows
                      : preferences.people;
                return (
                  <TabsContent key={tab} value={tab} className="mt-6">
                    <FavoriteSection
                      title={title}
                      items={section.map(convertToContentItem)}
                      type={type}
                      onRemove={(id) => handleRemove(id, type)}
                      onAdd={() => openAdd(type)}
                      showEmptyState
                      limit={10}
                    />
                  </TabsContent>
                );
              })}
            </Tabs>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

/**
 * Live preference profile: animated profile-strength, quick stats, genre
 * chips, min-rating, content tiles. Surfaces data (favoriteGenres,
 * minRating, preferredContent) that previously had no UI anywhere.
 */
function ProfilePanel() {
  const { preferences } = usePreferencesContext();

  const totalFavorites =
    preferences.movies.length +
    preferences.tvShows.length +
    preferences.people.length;

  const maxGenres = 20;
  const profileStrength = (() => {
    let score = 0;
    score += Math.min(preferences.movies.length * 5, 25);
    score += Math.min(preferences.tvShows.length * 5, 25);
    score += Math.min(preferences.people.length * 4, 20);
    score += Math.min(preferences.favoriteGenres.length * 3, 15);
    score += preferences.minRating > 0 ? 15 : 0;
    return Math.min(score, 100);
  })();

  const strengthLabel =
    profileStrength >= 80
      ? "Excellent"
      : profileStrength >= 60
        ? "Good"
        : profileStrength >= 40
          ? "Fair"
          : "Needs work";

  const stats = [
    {
      icon: Film,
      label: "Movies",
      value: preferences.movies.length,
      tint: "text-chart-1",
    },
    {
      icon: Tv,
      label: "TV Shows",
      value: preferences.tvShows.length,
      tint: "text-chart-2",
    },
    {
      icon: Users,
      label: "People",
      value: preferences.people.length,
      tint: "text-chart-3",
    },
    {
      icon: Heart,
      label: "Total",
      value: totalFavorites,
      tint: "text-primary",
    },
  ];

  return (
    <motion.div
      variants={fadeUpContainer}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 lg:grid-cols-5 gap-6"
    >
      {/* Profile strength */}
      <motion.div variants={fadeUpItem} className="lg:col-span-2">
        <Card className="glass h-full">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Heart className="h-4 w-4" />
              Profile Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-end justify-between">
              <span className="text-5xl font-bold font-display tracking-tight">
                {profileStrength}
                <span className="text-2xl text-muted-foreground">%</span>
              </span>
              <Badge variant="secondary" className="text-xs font-medium">
                {strengthLabel}
              </Badge>
            </div>
            <Progress value={profileStrength} className="h-1.5" />
            <p className="text-xs text-muted-foreground">
              Add more favorites and genres to sharpen your recommendations.
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Quick stats */}
      <motion.div variants={fadeUpItem} className="lg:col-span-3">
        <Card className="glass h-full">
          <CardContent className="p-4 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 h-full">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col items-center justify-center rounded-lg bg-muted/40 p-4 text-center"
                >
                  <stat.icon className={`h-5 w-5 mb-2 ${stat.tint}`} />
                  <div className="text-3xl font-bold font-display">
                    {stat.value}
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Genres + min rating */}
      {(preferences.favoriteGenres.length > 0 || preferences.minRating > 0) && (
        <motion.div variants={fadeUpItem} className="lg:col-span-5">
          <Card className="glass">
            <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row gap-6">
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium">Favorite Genres</span>
                  <Badge variant="outline" className="text-xs">
                    {preferences.favoriteGenres.length}/{maxGenres}
                  </Badge>
                </div>
                {preferences.favoriteGenres.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {preferences.favoriteGenres.map((genre) => (
                      <Badge
                        key={genre}
                        variant="secondary"
                        className="text-xs"
                      >
                        {genre}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    No genres selected yet
                  </p>
                )}
              </div>
              <div className="sm:w-px sm:bg-border" />
              <div className="flex items-center gap-3">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500 shrink-0" />
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-2xl font-bold font-display">
                      {preferences.minRating}
                    </span>
                    <span className="text-xs text-muted-foreground">/ 10</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    Minimum rating
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  );
}

interface FavoriteSectionProps {
  title: string;
  items: ContentItem[];
  type: "movie" | "tv" | "person";
  onRemove: (id: number) => void;
  onAdd?: () => void;
  showEmptyState?: boolean;
  limit?: number;
}

function FavoriteSection({
  title,
  items,
  type,
  onRemove,
  onAdd,
  showEmptyState,
  limit,
}: FavoriteSectionProps) {
  const displayItems = limit ? items.slice(0, limit) : items;
  const hasMore = limit !== undefined && items.length > limit;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {onAdd && (
          <Button onClick={onAdd} size="sm" variant="outline">
            <Plus className="h-4 w-4" />
            Add
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        showEmptyState && (
          <div className="text-center py-10 border border-dashed border-muted rounded-lg flex flex-col items-center justify-center">
            <p className="text-sm text-muted-foreground mb-4">
              No {title.toLowerCase()} added yet
            </p>
            {onAdd && (
              <Button onClick={onAdd} size="sm">
                <Plus className="h-4 w-4" />
                Add {title.slice(0, -1)}
              </Button>
            )}
          </div>
        )
      ) : (
        <>
          <motion.div
            variants={fadeUpContainer}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3"
          >
            {displayItems.map((item) => (
              <motion.div key={item.id} variants={fadeUpItem}>
                <PreferenceItem
                  item={item}
                  onRemove={() => onRemove(item.id)}
                />
              </motion.div>
            ))}
          </motion.div>
          {hasMore && (
            <div className="mt-4 flex justify-center">
              <Button
                asChild
                variant="link"
                size="sm"
                className="text-sm gap-1"
              >
                <Link to={`/preferences/${type}`}>
                  Show all {items.length} {title.toLowerCase()}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          )}
        </>
      )}
    </div>
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
