import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Calendar, Film, Tv, Users, Camera, UserIcon } from "lucide-react";
import { FilmInfo, Person } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PreferenceItemProps {
  item: FilmInfo | Person;
  type: "movie" | "tv" | "person";
  onRemove: () => void;
  compact?: boolean;
}

const getCategoryIcon = (category: Person["category"]) => {
  switch (category) {
    case "actor":
      return <Film className="h-3 w-3" />;
    case "director":
      return <Camera className="h-3 w-3" />;
    case "other":
      return <UserIcon className="h-3 w-3" />;
    default:
      return <Users className="h-3 w-3" />;
  }
};

const getCategoryBadgeVariant = (
  category: Person["category"]
): "default" | "secondary" | "outline" => {
  switch (category) {
    case "actor":
      return "default";
    case "director":
      return "secondary";
    case "other":
      return "outline";
    default:
      return "secondary";
  }
};

export function PreferenceItem({
  item,
  type,
  onRemove,
  compact = false,
}: PreferenceItemProps) {
  const getItemInfo = () => {
    if (type === "person") {
      const person = item as Person;
      return {
        title: person.name,
        subtitle: null,
        imageUrl: person.profileImageUrl,
        rating: null,
        date: null,
        genres: [],
        category: person.category,
        extraInfo: person.knownFor?.slice(0, 5).map((film) => film.title),
        badgeText: person.category,
        badgeVariant: getCategoryBadgeVariant(person.category),
        categoryIcon: getCategoryIcon(person.category),
      };
    } else {
      const film = item as FilmInfo;
      return {
        title: film.title,
        subtitle: film.category === "movie" ? "Movie" : "TV Show",
        imageUrl: film.posterPath,
        rating: film.voteAverage,
        date: film.releaseDate
          ? new Date(film.releaseDate).getFullYear()
          : null,
        genres: film.genres,
        category: film.category,
        extraInfo: null,
        badgeText: film.category === "movie" ? "Film" : "TV",
        badgeVariant: "secondary" as const,
      };
    }
  };

  const info = getItemInfo();

  if (compact) {
    return (
      <div
        className={cn(
          "relative flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent transition-colors group"
        )}
      >
        {/* Close Button */}
        <Button
          size="sm"
          variant="ghost"
          onClick={onRemove}
          className="absolute top-1 right-1 h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200 z-10"
        >
          <Trash2 className="h-3 w-3" />
        </Button>

        {/* Image */}
        <div className="shrink-0">
          {info.imageUrl ? (
            <img
              src={info.imageUrl}
              alt={info.title}
              className="w-12 h-16 object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-16 bg-muted rounded flex items-center justify-center">
              {type === "person" ? (
                <div className="flex flex-col items-center">
                  {info.categoryIcon}
                  <Badge variant={info.badgeVariant} className="ml-1 text-xs">
                    {info.badgeText}
                  </Badge>
                </div>
              ) : type === "movie" ? (
                <Film className="h-5 w-5 text-muted-foreground" />
              ) : (
                <Tv className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 pr-8">
          <h4 className="font-medium text-sm truncate mb-1">
            {info.title}
          </h4>
          <p className="text-xs text-muted-foreground mb-1">{info.subtitle}</p>
          <div className="flex items-center gap-2">
            {info.date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{info.date}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card className="group hover:shadow-md transition-shadow cursor-pointer relative">
      {/* Close Button */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className="absolute top-2 right-2 h-6 w-6 p-0 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-md transition-all duration-200 z-10"
      >
        <Trash2 className="h-3 w-3" />
      </Button>

      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Image */}
          <div className="shrink-0">
            {info.imageUrl ? (
              <img
                src={info.imageUrl}
                alt={info.title}
                className="w-16 h-24 object-cover rounded-lg"
                loading="lazy"
              />
            ) : (
              <div className="w-16 h-24 bg-muted rounded-lg flex items-center justify-center">
                {type === "person" ? (
                  <div className="flex flex-col items-center gap-1">
                    {info.categoryIcon}
                    <Badge variant={info.badgeVariant} className="text-xs">
                      {info.badgeText}
                    </Badge>
                  </div>
                ) : (
                  <Film className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0 pr-8">
            <h3 className="font-medium text-sm truncate transition-colors mb-1">
              {info.title}
            </h3>

            <p className="text-xs text-muted-foreground mb-2">
              {info.subtitle}
            </p>

            {/* Metadata */}
            <div className="flex items-center gap-3">
              {type === "person" && (
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                  {info.categoryIcon}
                  <span className="capitalize">{info.badgeText}</span>
                </div>
              )}
              {info.date && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{info.date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
