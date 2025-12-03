import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Film, Tv, Users, Plus } from "lucide-react";
import { ContentSearchDialog } from "./content-search-dialog";
import { PreferenceItem } from "./preference-item";
import { usePreferences } from "./use-preferences";

export function PreferencesPage() {
  const { preferences, addPreference, removePreference, isLoading } =
    usePreferences();

  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchType, setSearchType] = useState<"movie" | "tv" | "person">(
    "movie"
  );

  const handleAddContent = (type: "movie" | "tv" | "person") => {
    setSearchType(type);
    setIsSearchOpen(true);
  };

  const handleContentSelected = (content: any) => {
    addPreference(content);
    toast.success(
      `${content.title || content.name} has been added to your preferences.`
    );
  };

  const handleRemovePreference = (
    id: number,
    type: "movie" | "tv" | "person"
  ) => {
    removePreference(id, type);
    toast.info("Item has been removed from your preferences.");
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
                        items={preferences.movies}
                        type="movie"
                        onRemove={(id) => handleRemovePreference(id, "movie")}
                        onAdd={() => handleAddContent("movie")}
                      />
                    )}
                    {preferences.tvShows.length > 0 && (
                      <ContentSection
                        title="TV Shows"
                        items={preferences.tvShows}
                        type="tv"
                        onRemove={(id) => handleRemovePreference(id, "tv")}
                        onAdd={() => handleAddContent("tv")}
                      />
                    )}
                    {preferences.people.length > 0 && (
                      <ContentSection
                        title="People"
                        items={preferences.people}
                        type="person"
                        onRemove={(id) => handleRemovePreference(id, "person")}
                        onAdd={() => handleAddContent("person")}
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
                    items={preferences.movies}
                    type="movie"
                    onRemove={(id) => handleRemovePreference(id, "movie")}
                    onAdd={() => handleAddContent("movie")}
                    showEmptyState
                  />
                </TabsContent>

                <TabsContent value="tv" className="mt-6">
                  <ContentSection
                    title="TV Shows"
                    items={preferences.tvShows}
                    type="tv"
                    onRemove={(id) => handleRemovePreference(id, "tv")}
                    onAdd={() => handleAddContent("tv")}
                    showEmptyState
                  />
                </TabsContent>

                <TabsContent value="people" className="mt-6">
                  <ContentSection
                    title="People"
                    items={preferences.people}
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
        existingIds={
          new Set([
            ...preferences.movies.map((item: any) => item.id),
            ...preferences.tvShows.map((item: any) => item.id),
            ...preferences.people.map((item: any) => item.id),
          ])
        }
      />
    </div>
  );
}

interface ContentSectionProps {
  title: string;
  items: any[];
  type: "movie" | "tv" | "person";
  onRemove: (id: number) => void;
  onAdd: () => void;
  showEmptyState?: boolean;
}

function ContentSection({
  title,
  items,
  type,
  onRemove,
  onAdd,
  showEmptyState,
}: ContentSectionProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <Button onClick={onAdd} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Add {title}
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ">
          {items.map((item) => (
            <PreferenceItem
              key={item.id}
              item={item}
              type={type}
              onRemove={() => onRemove(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
