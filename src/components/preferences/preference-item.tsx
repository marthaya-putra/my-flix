import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { motion } from "motion/react";
import { Trash2, Calendar, Film, Users, Camera, UserIcon } from "lucide-react";
import { ContentItem } from "@/lib/types";
import { HIT_ZONE } from "@/lib/utils";
import { tapSpring } from "@/lib/motion";

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

const getItemInfo = (item: ContentItem) => {
  if (item.contentType === "person") {
    return {
      title: item.name,
      subtitle: null,
      imageUrl: item.profileImageUrl,
      rating: null,
      date: null,
      category: item.category,
      badgeText: item.category,
      categoryIcon: getCategoryIcon(item.category),
    };
  }
  return {
    title: item.title,
    subtitle: item.contentType === "movie" ? "Movie" : "TV Show",
    imageUrl: item.posterPath,
    rating: item.voteAverage,
    date: item.releaseDate ? new Date(item.releaseDate).getFullYear() : null,
    category: item.contentType,
    badgeText: item.contentType === "movie" ? "Film" : "TV",
    categoryIcon: null,
  };
};

export function PreferenceItem({ item, onRemove }: PreferenceItemProps) {
  const info = getItemInfo(item);

  return (
    <Card className="hover-lift group relative w-full">
      {/* Remove — destructive tint, works on the OLED theme */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onRemove}
        className={`${HIT_ZONE} absolute top-2 right-2 h-7 w-7 p-0 z-10 text-muted-foreground/0 group-hover:text-muted-foreground hover:text-destructive hover:bg-destructive/15 rounded-md transition-[color,background-color,opacity] duration-200`}
        aria-label={`Remove ${info.title}`}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>

      <CardContent className="p-3">
        <div className="flex gap-3">
          {/* Poster / profile */}
          <div className="shrink-0">
            {info.imageUrl ? (
              <img
                src={info.imageUrl}
                alt={info.title}
                className="w-14 h-20 object-cover rounded-md"
                loading="lazy"
              />
            ) : (
              <div className="w-14 h-20 bg-muted rounded-md flex items-center justify-center">
                {item.contentType === "person" ? (
                  <div className="flex flex-col items-center gap-1 text-muted-foreground">
                    {info.categoryIcon}
                    <span className="text-[10px] capitalize">
                      {info.badgeText}
                    </span>
                  </div>
                ) : (
                  <Film className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex-1 min-w-0 pr-6 flex flex-col justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <h3 className="font-medium text-sm leading-tight line-clamp-2">
                  {info.title}
                </h3>
              </TooltipTrigger>
              <TooltipContent>
                <p>{info.title}</p>
              </TooltipContent>
            </Tooltip>

            {info.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {info.subtitle}
              </p>
            )}

            <div className="flex items-center gap-2 mt-1.5">
              {item.contentType === "person" && (
                <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] bg-muted text-muted-foreground">
                  {info.categoryIcon}
                  <span className="capitalize">{info.badgeText}</span>
                </div>
              )}
              {info.date && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3 w-3" />
                  <span className="text-xs">{info.date}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>

      {/* Press feedback — origin-aware, subtle squish on tap */}
      <motion.div
        aria-hidden
        transition={tapSpring}
        className="pointer-events-none absolute inset-0 rounded-xl ring-1 ring-transparent group-active:ring-primary/20"
      />
    </Card>
  );
}
