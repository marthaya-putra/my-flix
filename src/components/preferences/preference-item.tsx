import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Trash2,
  Calendar,
  Film,
  Tv,
  Users,
  Camera,
  UserIcon,
} from "lucide-react";
import { ContentItem } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PreferenceItemProps {
  item: ContentItem;
  onRemove: () => void;
}

const getCategoryIcon = (category: "actor" | "director" | "other") => {
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
  category: "actor" | "director" | "other"
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

const getItemInfo = (item: ContentItem) => {
  if (item.contentType === "person") {
    return {
      title: item.name,
      subtitle: null,
      imageUrl: item.profileImageUrl,
      rating: null,
      date: null,
      genres: [],
      category: item.category,
      extraInfo: item.knownFor?.slice(0, 5).map((film) => film.title),
      badgeText: item.category,
      badgeVariant: getCategoryBadgeVariant(item.category),
      categoryIcon: getCategoryIcon(item.category),
    };
  } else {
    return {
      title: item.title,
      subtitle: item.contentType === "movie" ? "Movie" : "TV Show",
      imageUrl: item.posterPath,
      rating: item.voteAverage,
      date: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
      genres: item.genres,
      category: item.contentType,
      extraInfo: null,
      badgeText: item.contentType === "movie" ? "Film" : "TV",
      badgeVariant: "secondary" as const,
    };
  }
};

export function PreferenceItem({ item, onRemove }: PreferenceItemProps) {
  const info = getItemInfo(item);

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
                {item.contentType === "person" ? (
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
              {item.contentType === "person" && (
                <div className="flex text-white items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-transparent dark:bg-gray-800 dark:text-gray-300">
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
