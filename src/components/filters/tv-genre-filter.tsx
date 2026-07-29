import { useNavigate, useSearch } from "@tanstack/react-router";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { TV_GENRES } from "@/lib/genres";
import { Route } from "@/routes/tvs.index";
import { BaseFilter } from "./base-filter";

export function TvGenreFilter() {
  const search = useSearch({ from: Route.id });
  const navigate = useNavigate({ from: Route.id });

  const selectedGenres =
    typeof search.genres === "string" && search.genres
      ? search.genres.split(",")
      : [];

  const handleGenreToggle = (genreId: string) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter((g) => g !== genreId)
      : [...selectedGenres, genreId];

    navigate({
      to: ".",
      search: {
        ...search,
        page: 1,
        genres: newGenres.length > 0 ? newGenres.join(",") : undefined,
      },
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
          {Object.entries(TV_GENRES).map(([id, name]) => (
            <Label
              htmlFor={`tv-genre-${id}`}
              key={id}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            >
              <Checkbox
                id={`tv-genre-${id}`}
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
