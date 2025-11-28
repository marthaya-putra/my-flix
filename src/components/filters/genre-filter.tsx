import { useSearch, useNavigate } from "@tanstack/react-router";
import { genres } from "@/lib/data/movies";
import BaseFilter from "./base-filter";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function GenreFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedGenres = typeof search.genres === 'string' && search.genres ? search.genres.split(',') : [];

  const handleGenreToggle = (genreId: string) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter(g => g !== genreId)
      : [...selectedGenres, genreId];

    navigate({
      search: {
        page: 1,
        genres: newGenres.length > 0 ? newGenres.join(',') : undefined,
        rating: search.rating,
        year: search.year,
      },
    });
  };

  return (
    <BaseFilter
      title="Genres"
      triggerText={`Genres${selectedGenres.length > 0 ? ` (${selectedGenres.length})` : ''}`}
      variant={selectedGenres.length > 0 ? "default" : "secondary"}
    >
      {() => (
        <div className="space-y-2">
          {Object.entries(genres).map(([id, name]) => (
            <div key={id} className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
              <Checkbox
                id={`genre-${id}`}
                checked={selectedGenres.includes(id)}
                onCheckedChange={() => handleGenreToggle(id)}
              />
              <Label htmlFor={`genre-${id}`}>{name}</Label>
            </div>
          ))}
        </div>
      )}
    </BaseFilter>
  );
}