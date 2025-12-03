import { useNavigate, useSearch } from "@tanstack/react-router";
import { genres as movieGenres } from "@/lib/data/movies";
import BaseFilter from "./base-filter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";

interface GenreFilterProps {
  route: typeof MoviesRoute | typeof TvsRoute;
}

export default function GenreFilter({ route }: GenreFilterProps) {
  const navigate = useNavigate({ from: route.path });
  const search = useSearch({ from: route.id });

  const genres = "genres" in search ? search.genres : undefined;
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
