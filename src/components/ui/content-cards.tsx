import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Star, Calendar, Plus, Check } from "lucide-react";
import { FilmInfo, Person } from "@/lib/types";

export interface MovieCardProps {
  movie: FilmInfo;
  onAdd?: (content: FilmInfo) => void;
  isAdded?: boolean;
}

export function MovieCard({ movie, onAdd, isAdded }: MovieCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-shadow relative ${isAdded ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
      {/* Added Badge */}
      {isAdded && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
          <Check className="h-3 w-3" />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Movie Poster */}
          {movie.posterPath ? (
            <img
              src={movie.posterPath}
              alt={movie.title}
              className="w-16 h-24 object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-24 bg-muted rounded flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {/* Movie Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
              {movie.title}
            </h3>
            {movie.releaseDate && (
              <p className="text-xs text-muted-foreground">
                {movie.releaseDate}
              </p>
            )}

            {/* Genres */}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {movie.genres.slice(0, 2).map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Rating */}
            {movie.voteAverage && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{movie.voteAverage.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Add Button */}
          {!isAdded && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdd?.(movie)}
              className="shrink-0 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface TVCardProps {
  tvShow: FilmInfo;
  onAdd?: (tvShow: FilmInfo) => void;
  isAdded?: boolean;
}

export function TVCard({ tvShow, onAdd, isAdded }: TVCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-shadow relative ${isAdded ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
      {/* Added Badge */}
      {isAdded && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
          <Check className="h-3 w-3" />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* TV Show Poster */}
          {tvShow.posterPath ? (
            <img
              src={tvShow.posterPath}
              alt={tvShow.title}
              className="w-16 h-24 object-cover rounded"
              loading="lazy"
            />
          ) : (
            <div className="w-16 h-24 bg-muted rounded flex items-center justify-center">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
          )}

          {/* TV Show Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
              {tvShow.title}
            </h3>
            {tvShow.releaseDate && (
              <p className="text-xs text-muted-foreground">
                {new Date(tvShow.releaseDate).getFullYear().toString()}
              </p>
            )}

            {/* Genres */}
            {tvShow.genres && tvShow.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {tvShow.genres.slice(0, 2).map((genre) => (
                  <Badge
                    key={genre}
                    variant="secondary"
                    className="text-xs px-1.5 py-0.5"
                  >
                    {genre}
                  </Badge>
                ))}
              </div>
            )}

            {/* Rating */}
            {tvShow.voteAverage && (
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                <span className="text-xs">{tvShow.voteAverage.toFixed(1)}</span>
              </div>
            )}
          </div>

          {/* Add Button */}
          {!isAdded && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdd?.(tvShow)}
              className="shrink-0 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export interface PersonCardProps {
  person: Person;
  onAdd?: (person: Person) => void;
  isAdded?: boolean;
}

export function PersonCard({ person, onAdd, isAdded }: PersonCardProps) {
  return (
    <Card className={`group hover:shadow-md transition-shadow relative ${isAdded ? 'ring-2 ring-primary/20 bg-primary/5' : ''}`}>
      {/* Added Badge */}
      {isAdded && (
        <div className="absolute top-2 right-2 z-10 bg-primary text-primary-foreground rounded-full p-1.5 shadow-sm">
          <Check className="h-3 w-3" />
        </div>
      )}

      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Person Profile */}
          {person.profileImageUrl ? (
            <img
              src={person.profileImageUrl}
              alt={person.name}
              className="w-12 h-12 object-cover rounded-full"
              loading="lazy"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No photo</span>
            </div>
          )}

          {/* Person Info */}
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-sm group-hover:text-primary transition-colors truncate">
              {person.name}
            </h3>
            <p className="text-xs text-muted-foreground">{person.category}</p>
          </div>

          {/* Add Button */}
          {!isAdded && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAdd?.(person)}
              className="shrink-0 h-8 w-8 p-0"
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
