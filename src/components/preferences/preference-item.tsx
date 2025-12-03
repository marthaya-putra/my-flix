import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  X,
  Star,
  Calendar,
  Film,
  Tv,
  Users,
  Info,
  Heart,
  Trash2,
  Edit,
  Camera,
  UserIcon,
} from "lucide-react";
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
  const [showDetails, setShowDetails] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const getItemInfo = () => {
    if (type === "person") {
      const person = item as Person;
      return {
        title: person.name,
        subtitle: `Popularity: ${person.popularity.toFixed(1)}`,
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

  console.log({ info });
  console.log({ compact });

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-accent transition-colors group",
          isHovered && "shadow-sm"
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Image */}
        <div className="flex-shrink-0">
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
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
              {info.title}
            </h4>
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDetails(true)}
                className="h-7 w-7 p-0"
              >
                <Info className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={onRemove}
                className="h-7 w-7 p-0 text-destructive hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mb-1">{info.subtitle}</p>
          <div className="flex items-center gap-2">
            {info.rating && (
              <div className="flex items-center gap-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{info.rating.toFixed(1)}</span>
              </div>
            )}
            {info.date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span className="text-xs">{info.date}</span>
              </div>
            )}
            {info.genres && info.genres.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {info.genres[0]}
                {info.genres.length > 1 && ` +${info.genres.length - 1}`}
              </Badge>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Card
        className="group hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => setShowDetails(true)}
      >
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Image */}
            <div className="flex-shrink-0">
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
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between mb-2">
                <div className="min-w-0 flex-1">
                  <h3 className="font-medium text-sm mb-1 truncate group-hover:text-primary transition-colors">
                    {info.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {info.subtitle}
                  </p>
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowDetails(true);
                    }}
                    className="h-7 w-7 p-0"
                  >
                    <Info className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove();
                    }}
                    className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              {/* Metadata */}
              <div className="flex items-center gap-3 mb-2">
                {type === "person" && (
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                    {info.categoryIcon}
                    <span className="capitalize">{info.badgeText}</span>
                  </div>
                )}
                {info.rating && (
                  <div className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs font-medium">
                      {info.rating.toFixed(1)}
                    </span>
                  </div>
                )}
                {info.date && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span className="text-xs">{info.date}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {info.genres && info.genres.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {info.genres.slice(0, 2).map((genre) => (
                    <Badge key={genre} variant="secondary" className="text-xs">
                      {genre}
                    </Badge>
                  ))}
                  {info.genres.length > 2 && (
                    <Badge variant="secondary" className="text-xs">
                      +{info.genres.length - 2}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {type === "person" && info.categoryIcon}
              {type === "movie" && <Film className="h-5 w-5" />}
              {type === "tv" && <Tv className="h-5 w-5" />}
              {info.title}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              {info.subtitle}
              {type === "person" && (
                <Badge variant={info.badgeVariant} className="text-xs">
                  {info.badgeText}
                </Badge>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Image */}
            <div className="flex-shrink-0">
              {info.imageUrl ? (
                <img
                  src={info.imageUrl}
                  alt={info.title}
                  className="w-full rounded-lg"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-muted rounded-lg flex flex-col items-center justify-center gap-2">
                  {type === "person" ? (
                    <>
                      {info.categoryIcon}
                      <Badge variant={info.badgeVariant} className="text-xs">
                        {info.badgeText}
                      </Badge>
                    </>
                  ) : (
                    <Film className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
              )}
            </div>

            {/* Details */}
            <div className="md:col-span-2 space-y-4">
              {/* Metadata */}
              <div className="flex items-center gap-4">
                {info.rating && (
                  <div className="flex items-center gap-2">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium">
                      {info.rating.toFixed(1)}/10
                    </span>
                  </div>
                )}
                {info.date && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{info.date}</span>
                  </div>
                )}
              </div>

              {/* Genres */}
              {info.genres && info.genres.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Genres</h4>
                  <div className="flex flex-wrap gap-1">
                    {info.genres.map((genre) => (
                      <Badge key={genre} variant="secondary">
                        {genre}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Known For (Actors) */}
              {info.extraInfo && info.extraInfo.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Known For</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {info.extraInfo.map((title, index) => (
                      <div
                        key={index}
                        className="text-sm text-muted-foreground"
                      >
                        • {title}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-4">
                <Button variant="outline" onClick={() => setShowDetails(false)}>
                  Close
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    onRemove();
                    setShowDetails(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove from Favorites
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
