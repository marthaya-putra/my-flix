import { useNavigate, useSearch } from "@tanstack/react-router";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";

interface ClearFiltersProps {
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof MoviesSearchRoute;
}

export default function ClearFilters({ route }: ClearFiltersProps) {
  const navigate = useNavigate({ from: route.path });
  const search = useSearch({ from: route.id });

  const genres = "genres" in search ? search.genres : undefined;
  const rating = "rating" in search ? search.rating : undefined;
  const year = "year" in search ? search.year : undefined;

  const hasActiveFilters = genres || rating || year;

  const handleClearAll = () => {
    if ("query" in search) {
      navigate({
        search: {
          query: search.query,
        },
      });
    } else {
      navigate({
        search: {
          page: "page" in search ? search.page : undefined,
          genres: undefined,
          rating: undefined,
          year: undefined,
        },
      });
    }
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
