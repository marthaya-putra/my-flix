import { getRouteApi } from "@tanstack/react-router";
import { genres as movieGenres } from "@/lib/data/movies";
import BaseFilter from "./base-filter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Scoped, typed hooks for the /movies/ route. Avoids importing the route
// value (which would create a circular import back to the route file that
// renders this component) and avoids passing the route as a prop.
const moviesRoute = getRouteApi("/movies/");

export default function GenreFilter() {
  const navigate = moviesRoute.useNavigate();
  const search = moviesRoute.useSearch();

  const genres = search.genres;
  const selectedGenres =
    typeof genres === "string" && genres ? genres.split(",") : [];

  const handleGenreToggle = (genreId: string) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter((g: string) => g !== genreId)
      : [...selectedGenres, genreId];

    navigate({
      to: ".",
      search: (prev) => ({
        ...prev,
        page: 1,
        genres: newGenres.length > 0 ? newGenres.join(",") : undefined,
      }),
    });
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
