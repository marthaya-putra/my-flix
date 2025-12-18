import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

import { toast } from "sonner";
import { Film, Tv, Users, Plus } from "lucide-react";
import { ContentSearchDialog } from "./content-search-dialog";
import { PreferenceItem } from "./preference-item";
import { usePreferences } from "./use-preferences";
import { UserPreferences, FilmInfoWithDbId, PersonWithDbId } from "@/lib/types/preferences";
import { ContentItem, FilmInfo, Person } from "@/lib/types";

interface PreferencesPageProps {
  initialPreferences?: UserPreferences;
}

export function PreferencesPage({ initialPreferences }: PreferencesPageProps) {
  const { preferences, addPreference, removePreference } =
    usePreferences(initialPreferences);

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<"movie" | "tv" | "person">(
    "movie"
  );

  const handleAddContent = (type: "movie" | "tv" | "person") => {
    setSearchType(type);
    setIsSearchOpen(true);
  };

  const handleContentSelected = (content: ContentItem) => {
    // Convert ContentItem to FilmInfo or Person for the addPreference function
    if (content.contentType === 'person') {
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
      addPreference(person);
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
        category: content.contentType === 'movie' ? 'movie' : 'tv',
        genreIds: content.genreIds,
        genres: content.genres,
      };
      addPreference(film);
      toast.success(`${content.title} has been added to your preferences.`);
    }
  };

  const handleRemovePreference = (
    id: number,
    type: "movie" | "tv" | "person"
  ) => {
    removePreference(id, type);
    toast.info("Item has been removed from your preferences.");
  };

  // Helper function to convert preferences items to ContentItem for display
  const convertToContentItem = (item: FilmInfoWithDbId | PersonWithDbId): ContentItem => {
    if ('knownFor' in item) {
      // It's a person
      const person = item as PersonWithDbId;
      return {
        ...person,
        contentType: 'person',
      };
    } else {
      // It's a film (movie or TV)
      const film = item as FilmInfoWithDbId;
      return {
        ...film,
        contentType: film.category === 'tv' ? 'tv' : 'movie',
      };
    }
  };

  const existingIds = new Set([
    ...preferences.movies.map((item: FilmInfoWithDbId) => item.id),
    ...preferences.tvShows.map((item: FilmInfoWithDbId) => item.id),
    ...preferences.people.map((item: PersonWithDbId) => item.id),
  ]);

  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Your Preferences</h1>
        <p className="text-muted-foreground">
          Tell us what you like to get personalized recommendations.
        </p>
      </div>

      <div className="grid grid-cols-1  gap-6">
        {/* Content Preferences */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Favorites</CardTitle>
              <CardDescription>
                Add movies, TV shows, and people you love
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="all" className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger
                    value="movies"
                    className="flex items-center gap-2"
                  >
                    <Film className="h-4 w-4" />
                    Movies
                  </TabsTrigger>
                  <TabsTrigger value="tv" className="flex items-center gap-2">
                    <Tv className="h-4 w-4" />
                    TV Shows
                  </TabsTrigger>
                  <TabsTrigger
                    value="people"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    People
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="all" className="mt-6">
                  <div className="space-y-6">
                    {preferences.movies.length > 0 && (
                      <ContentSection
                        title="Movies"
                        items={preferences.movies.map(convertToContentItem)}
                        type="movie"
                        onRemove={(id) => handleRemovePreference(id, "movie")}
                        onAdd={() => handleAddContent("movie")}
                        limitItems
                      />
                    )}
                    {preferences.tvShows.length > 0 && (
                      <ContentSection
                        title="TV Shows"
                        items={preferences.tvShows.map(convertToContentItem)}
                        type="tv"
                        onRemove={(id) => handleRemovePreference(id, "tv")}
                        onAdd={() => handleAddContent("tv")}
                        limitItems
                      />
                    )}
                    {preferences.people.length > 0 && (
                      <ContentSection
                        title="People"
                        items={preferences.people.map(convertToContentItem)}
                        type="person"
                        onRemove={(id) => handleRemovePreference(id, "person")}
                        onAdd={() => handleAddContent("person")}
                        limitItems
                      />
                    )}
                    {preferences.movies.length === 0 &&
                      preferences.tvShows.length === 0 &&
                      preferences.people.length === 0 && (
                        <div className="text-center py-12">
                          <p className="text-muted-foreground mb-4">
                            No preferences added yet. Start by adding your
                            favorite content!
                          </p>
                          <div className="flex flex-wrap gap-2 justify-center">
                            <Button onClick={() => handleAddContent("movie")}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add Movies
                            </Button>
                            <Button onClick={() => handleAddContent("tv")}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add TV Shows
                            </Button>
                            <Button onClick={() => handleAddContent("person")}>
                              <Plus className="h-4 w-4 mr-2" />
                              Add People
                            </Button>
                          </div>
                        </div>
                      )}
                  </div>
                </TabsContent>

                <TabsContent value="movies" className="mt-6">
                  <ContentSection
                    title="Movies"
                    items={preferences.movies.map(convertToContentItem)}
                    type="movie"
                    onRemove={(id) => handleRemovePreference(id, "movie")}
                    onAdd={() => handleAddContent("movie")}
                    showEmptyState
                  />
                </TabsContent>

                <TabsContent value="tv" className="mt-6">
                  <ContentSection
                    title="TV Shows"
                    items={preferences.tvShows.map(convertToContentItem)}
                    type="tv"
                    onRemove={(id) => handleRemovePreference(id, "tv")}
                    onAdd={() => handleAddContent("tv")}
                    showEmptyState
                  />
                </TabsContent>

                <TabsContent value="people" className="mt-6">
                  <ContentSection
                    title="People"
                    items={preferences.people.map(convertToContentItem)}
                    type="person"
                    onRemove={(id) => handleRemovePreference(id, "person")}
                    onAdd={() => handleAddContent("person")}
                    showEmptyState
                  />
                </TabsContent>
              </Tabs>
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

interface ContentSectionProps {
  title: string;
  items: ContentItem[];
  type: "movie" | "tv" | "person";
  onRemove: (id: number) => void;
  onAdd: () => void;
  showEmptyState?: boolean;
  limitItems?: boolean;
}

function ContentSection({
  title,
  items,
  type,
  onRemove,
  onAdd,
  showEmptyState,
  limitItems = false,
}: ContentSectionProps) {
  const displayItems = limitItems ? items.slice(0, 5) : items;
  const hasMore = limitItems && items.length > 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        showEmptyState && (
          <div className="text-center py-12 border-2 border-dashed border-muted rounded-lg  flex flex-col items-center justify-center">
            <p className="text-muted-foreground mb-4">
              No {title.toLowerCase()} added yet
            </p>
            <Button onClick={onAdd} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add {title.slice(0, -1)}
            </Button>
          </div>
        )
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {displayItems.map((item: ContentItem) => (
              <PreferenceItem
                key={item.id}
                item={item}
                onRemove={() => onRemove(item.id)}
              />
            ))}
          </div>
          {hasMore && (
            <div className="mt-4 text-center">
              <Link to={`/preferences/${type}`}>
                <Button variant="link" className="text-sm">
                  Show all {items.length} {title.toLowerCase()} →
                </Button>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}
