import { useSearch, useNavigate } from "@tanstack/react-router";
import { genres } from "@/lib/data/movies";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function GenreFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedGenres = typeof search.genres === 'string' && search.genres ? search.genres.split(',') : [];

  const handleGenresChange = (newGenres: string[]) => {
    navigate({
      search: {
        page: 1,
        genres: newGenres.length > 0 ? newGenres.join(',') : undefined,
        rating: search.rating,
        year: search.year,
      },
    });
  };

  const handleGenresClick = (id: string) => {
    const newGenres = selectedGenres.includes(id)
      ? selectedGenres.filter(g => g !== id)
      : [...selectedGenres, id];
    handleGenresChange(newGenres);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
            selectedGenres.length > 0
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary hover:shadow-md"
          }`}
        >
          {selectedGenres.length > 0 ? `Genres (${selectedGenres.length})` : "Select genres"}
          <span className="ml-2 text-xs">▼</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-72 p-0" align="start">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">Select Genres</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {Object.entries(genres).length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No genres available
              </div>
            ) : (
              Object.entries(genres).map(([id, name]) => (
                <label
                  key={id}
                  className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
                >
                  <input
                    type="checkbox"
                    checked={selectedGenres.includes(id)}
                    onChange={() => handleGenresClick(id)}
                    className="h-5 w-5 rounded border-border text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <span className="text-base text-foreground">{name}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}