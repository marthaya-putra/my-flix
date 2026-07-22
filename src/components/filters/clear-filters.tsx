import { useNavigate, useSearch } from "@tanstack/react-router";

interface ClearFiltersProps {
  from: "/movies/" | "/tvs/" | "/tvs/airing-today" | "/movies/search";
}

export default function ClearFilters({ from }: ClearFiltersProps) {
  const navigate = useNavigate({ from });
  const search = useSearch({ from });

  const genres = "genres" in search ? search.genres : undefined;
  const rating = "rating" in search ? search.rating : undefined;
  const year = "year" in search ? search.year : undefined;

  const hasActiveFilters = genres || rating || year;

  const handleClearAll = () => {
    navigate({
      search: undefined,
    });
  };

  if (!hasActiveFilters) {
    return null;
  }

  return (
    <button
      onClick={handleClearAll}
      className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 font-medium hover:bg-accent/50 rounded-lg"
    >
      Clear all
    </button>
  );
}
