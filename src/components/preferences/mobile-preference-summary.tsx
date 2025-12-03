import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Film, Tv, Users, Star, Heart, TrendingUp, ChevronDown, ChevronUp, Plus, Camera } from "lucide-react";
import { UserPreferences } from "./use-preferences";

interface MobilePreferenceSummaryProps {
  preferences: UserPreferences;
  onAddContent?: () => void;
  onEditProfile?: () => void;
  className?: string;
}

export function MobilePreferenceSummary({
  preferences,
  onAddContent,
  onEditProfile,
  className,
}: MobilePreferenceSummaryProps) {
  const [isOpen, setIsOpen] = React.useState(true);
  const totalFavorites = preferences.movies.length + preferences.tvShows.length + preferences.people.length;

  // Count person categories
  const personCategories = preferences.people.reduce((acc, person) => {
    acc[person.category] = (acc[person.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const getProfileStrength = () => {
    let score = 0;
    const maxScore = 100;

    score += Math.min(preferences.movies.length * 5, 25);
    score += Math.min(preferences.tvShows.length * 5, 25);
    score += Math.min(preferences.people.length * 4, 20);
    score += Math.min(preferences.favoriteGenres.length * 3, 15);
    score += preferences.minRating > 0 ? 15 : 0;

    return Math.min(Math.round((score / maxScore) * 100), 100);
  };

  const profileStrength = getProfileStrength();
  const getProfileColor = () => {
    if (profileStrength >= 80) return "text-green-500";
    if (profileStrength >= 60) return "text-yellow-500";
    if (profileStrength >= 40) return "text-orange-500";
    return "text-red-500";
  };

  return (
    <Card className={`${className} shadow-sm`}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="pb-3 cursor-pointer">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Your Profile
              </CardTitle>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className={`text-xs ${getProfileColor()}`}>
                  {profileStrength}%
                </Badge>
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            {/* Progress Bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span>Profile Completion</span>
                <span className={getProfileColor()}>{profileStrength}%</span>
              </div>
              <Progress value={profileStrength} className="h-2" />
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="p-2 bg-muted/30 rounded">
                <Film className="h-3 w-3 mx-auto mb-1 text-blue-500" />
                <div className="text-xs font-bold">{preferences.movies.length}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <Tv className="h-3 w-3 mx-auto mb-1 text-purple-500" />
                <div className="text-xs font-bold">{preferences.tvShows.length}</div>
              </div>
              <div className="p-2 bg-muted/30 rounded">
                <Users className="h-3 w-3 mx-auto mb-1 text-green-500" />
                <div className="text-xs font-bold">{preferences.people.length}</div>
              </div>
              <div className="p-2 bg-primary/10 rounded">
                <Star className="h-3 w-3 mx-auto mb-1 text-yellow-500" />
                <div className="text-xs font-bold">{preferences.minRating}+</div>
              </div>
            </div>

            {/* Person Categories Breakdown */}
            {preferences.people.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium">Person Categories</span>
                  <span className="text-muted-foreground">{preferences.people.length} total</span>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {(personCategories.actor > 0) && (
                    <div className="p-2 bg-blue-50 dark:bg-blue-950 rounded text-center">
                      <Film className="h-3 w-3 mx-auto mb-1 text-blue-600 dark:text-blue-400" />
                      <div className="text-xs font-bold text-blue-600 dark:text-blue-400">{personCategories.actor}</div>
                      <div className="text-xs text-blue-500 dark:text-blue-300">Actors</div>
                    </div>
                  )}
                  {(personCategories.director > 0) && (
                    <div className="p-2 bg-green-50 dark:bg-green-950 rounded text-center">
                      <Camera className="h-3 w-3 mx-auto mb-1 text-green-600 dark:text-green-400" />
                      <div className="text-xs font-bold text-green-600 dark:text-green-400">{personCategories.director}</div>
                      <div className="text-xs text-green-500 dark:text-green-300">Directors</div>
                    </div>
                  )}
                  {(personCategories.other > 0) && (
                    <div className="p-2 bg-gray-50 dark:bg-gray-950 rounded text-center">
                      <Star className="h-3 w-3 mx-auto mb-1 text-gray-600 dark:text-gray-400" />
                      <div className="text-xs font-bold text-gray-600 dark:text-gray-400">{personCategories.other}</div>
                      <div className="text-xs text-gray-500 dark:text-gray-300">Other</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Genres */}
            {preferences.favoriteGenres.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Genres ({preferences.favoriteGenres.length})</span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {preferences.favoriteGenres.slice(0, 6).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs h-5 px-2">
                      {genre}
                    </Badge>
                  ))}
                  {preferences.favoriteGenres.length > 6 && (
                    <Badge variant="outline" className="text-xs h-5 px-2">
                      +{preferences.favoriteGenres.length - 6}
                    </Badge>
                  )}
                </div>
              </div>
            )}

            {/* Content Preferences */}
            <div className="grid grid-cols-2 gap-2">
              <div
                className={`p-2 rounded-lg text-center text-xs ${
                  preferences.preferredContent.movie
                    ? "bg-blue-50 dark:bg-blue-950 text-blue-600 border border-blue-200 dark:border-blue-800"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <Film className="h-3 w-3 mx-auto mb-1" />
                Movies
              </div>
              <div
                className={`p-2 rounded-lg text-center text-xs ${
                  preferences.preferredContent.tv
                    ? "bg-purple-50 dark:bg-purple-950 text-purple-600 border border-purple-200 dark:border-purple-800"
                    : "bg-muted/30 text-muted-foreground"
                }`}
              >
                <Tv className="h-3 w-3 mx-auto mb-1" />
                TV Shows
              </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={onAddContent}
                size="sm"
                variant="outline"
                className="text-xs h-8"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add Favorites
              </Button>
              <Button
                onClick={onEditProfile}
                size="sm"
                variant="outline"
                className="text-xs h-8"
              >
                Edit Profile
              </Button>
            </div>

            {/* Recommendations Preview */}
            {totalFavorites >= 5 && (
              <div className="pt-2 border-t">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3" />
                    <span className="text-xs font-medium">Recommendations</span>
                  </div>
                </div>
                <div className="text-center p-3 bg-primary/5 rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    🎯 Great! Based on your {totalFavorites} favorites, we can show you personalized content.
                  </p>
                </div>
              </div>
            )}

            {/* Empty State */}
            {totalFavorites === 0 && (
              <div className="text-center py-4">
                <Heart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs text-muted-foreground mb-3">
                  Start adding your favorite content to get personalized recommendations
                </p>
                <Button onClick={onAddContent} size="sm" className="text-xs">
                  <Plus className="h-3 w-3 mr-1" />
                  Add Your First Favorite
                </Button>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}