import { useNavigate, useSearch } from "@tanstack/react-router";
import { genres as movieGenres } from "@/lib/data/movies";
import BaseFilter from "./base-filter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";

interface GenreFilterProps {
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof MoviesSearchRoute;
}

export default function GenreFilter({ route }: GenreFilterProps) {
  const navigate = useNavigate({ from: route.id } as any);
  const search = useSearch({ from: route.id });

  const genres = "genres" in search ? search.genres : undefined;
  const selectedGenres =
    typeof genres === "string" && genres
      ? genres.split(",")
      : [];

  const handleGenreToggle = (genreId: string) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter((g: string) => g !== genreId)
      : [...selectedGenres, genreId];

    if ("query" in search) {
      return;
    } else {
      navigate({
        search: {
          page: "page" in search ? search.page : 1,
          genres: newGenres.length > 0 ? newGenres.join(",") : undefined,
          rating: "rating" in search ? search.rating : undefined,
          year: "year" in search ? search.year : undefined,
        },
      });
    }
  };

  return (
    <BaseFilter
      title="Genres"
      triggerText={`Genres${selectedGenres.length > 0 ? ` (${selectedGenres.length})` : ""}`}
      variant={selectedGenres.length > 0 ? "default" : "secondary"}
    >
      {() => (
        <div className="space-y-2">
          {Object.entries(movieGenres).map(([id, name]) => (
            <Label
              htmlFor={`genre-${id}`}
              key={id}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            >
              <Checkbox
                id={`genre-${id}`}
                checked={selectedGenres.includes(id)}
                onCheckedChange={() => handleGenreToggle(id)}
              />
              <span>{name}</span>
            </Label>
          ))}
        </div>
      )}
    </BaseFilter>
  );
}
