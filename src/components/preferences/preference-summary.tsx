import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Film, Tv, Users, Star, Heart, TrendingUp } from "lucide-react";
import { UserPreferences } from "@/lib/types/preferences";

interface PreferenceSummaryProps {
  preferences: UserPreferences;
  className?: string;
}

export function PreferenceSummary({
  preferences,
  className,
}: PreferenceSummaryProps) {
  const totalFavorites =
    preferences.movies.length +
    preferences.tvShows.length +
    preferences.people.length;
  const maxGenres = 20;
  const genreProgress = (preferences.favoriteGenres.length / maxGenres) * 100;

  const getProfileStrength = () => {
    let score = 0;
    const maxScore = 100;

    // Movies (up to 25 points)
    score += Math.min(preferences.movies.length * 5, 25);

    // TV Shows (up to 25 points)
    score += Math.min(preferences.tvShows.length * 5, 25);

    // People (up to 20 points)
    score += Math.min(preferences.people.length * 4, 20);

    // Genres (up to 15 points)
    score += Math.min(preferences.favoriteGenres.length * 3, 15);

    // Rating preference (up to 15 points)
    score += preferences.minRating > 0 ? 15 : 0;

    return Math.min(Math.round((score / maxScore) * 100), 100);
  };

  const profileStrength = getProfileStrength();
  const getProfileColor = () => {
    if (profileStrength >= 80) return "text-green-600";
    if (profileStrength >= 60) return "text-yellow-600";
    if (profileStrength >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getProfileText = () => {
    if (profileStrength >= 80) return "Excellent";
    if (profileStrength >= 60) return "Good";
    if (profileStrength >= 40) return "Fair";
    return "Needs Work";
  };

  // Mobile-first responsive design
  return (
    <div className={className}>
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Heart className="h-5 w-5" />
            Preference Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Profile Strength */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Profile Strength</span>
              <span className={`text-sm font-bold ${getProfileColor()}`}>
                {profileStrength}% - {getProfileText()}
              </span>
            </div>
            <Progress value={profileStrength} className="h-2" />
            <p className="text-xs text-muted-foreground">
              Add more favorites and genres to improve your recommendations
            </p>
          </div>

          <Separator />

          {/* Stats Grid - Mobile responsive */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* Movies */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Film className="h-5 w-5 text-blue-600" />
              </div>
              <div className="text-2xl font-bold text-lg">
                {preferences.movies.length}
              </div>
              <div className="text-xs text-muted-foreground">Movies</div>
            </div>

            {/* TV Shows */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Tv className="h-5 w-5 text-purple-600" />
              </div>
              <div className="text-2xl font-bold text-lg">
                {preferences.tvShows.length}
              </div>
              <div className="text-xs text-muted-foreground">TV Shows</div>
            </div>

            {/* People */}
            <div className="text-center p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div className="text-2xl font-bold text-lg">
                {preferences.people.length}
              </div>
              <div className="text-xs text-muted-foreground">People</div>
            </div>

            {/* Total */}
            <div className="text-center p-3 bg-primary/10 rounded-lg">
              <div className="flex items-center justify-center mb-2">
                <Heart className="h-5 w-5 text-red-600" />
              </div>
              <div className="text-2xl font-bold text-lg">{totalFavorites}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
          </div>

          {/* Preferences Summary */}
          <div className="space-y-4">
            {/* Favorite Genres */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Favorite Genres</span>
                <Badge variant="outline" className="text-xs">
                  {preferences.favoriteGenres.length}/{maxGenres}
                </Badge>
              </div>
              {preferences.favoriteGenres.length > 0 ? (
                <div className="flex flex-wrap gap-1">
                  {preferences.favoriteGenres.map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 border-2 border-dashed border-muted rounded-lg">
                  <p className="text-xs text-muted-foreground">
                    No genres selected yet
                  </p>
                </div>
              )}
              <Progress value={genreProgress} className="h-1 mt-2" />
            </div>

            {/* Content Preferences */}
            <div>
              <span className="text-sm font-medium mb-2 block">
                Content Preferences
              </span>
              <div className="grid grid-cols-2 gap-2">
                <div
                  className={`p-3 rounded-lg border text-center ${
                    preferences.preferredContent.movie
                      ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950"
                      : "border-muted bg-muted/30"
                  }`}
                >
                  <Film className="h-4 w-4 mx-auto mb-1" />
                  <span className="text-xs font-medium">Movies</span>
                </div>
                <div
                  className={`p-3 rounded-lg border text-center ${
                    preferences.preferredContent.tv
                      ? "border-purple-200 bg-purple-50 dark:border-purple-800 dark:bg-purple-950"
                      : "border-muted bg-muted/30"
                  }`}
                >
                  <Tv className="h-4 w-4 mx-auto mb-1" />
                  <span className="text-xs font-medium">TV Shows</span>
                </div>
              </div>
            </div>

            {/* Rating Preference */}
            <div>
              <span className="text-sm font-medium mb-2 block">
                Minimum Rating
              </span>
              <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                <Star className="h-5 w-5 text-yellow-500 fill-yellow-500" />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-2xl font-bold">
                      {preferences.minRating}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      out of 10
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                    <div
                      className="bg-yellow-500 h-1.5 rounded-full"
                      style={{
                        width: `${(preferences.minRating / 10) * 100}%`,
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            {preferences.notes && (
              <div>
                <span className="text-sm font-medium mb-2 block">Notes</span>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    {preferences.notes}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations Preview - Mobile optimized */}
      {totalFavorites >= 3 && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5" />
              Your Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="animate-pulse flex items-center justify-center mb-4">
                <TrendingUp className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium mb-2">
                Personalized recommendations coming soon!
              </p>
              <p className="text-xs text-muted-foreground">
                Based on your {totalFavorites} favorites, we'll find content
                you'll love.
              </p>
              <div className="mt-4 p-3 bg-primary/10 rounded-lg">
                <p className="text-xs text-primary font-medium">
                  🎯 Keep adding favorites to get better recommendations
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
