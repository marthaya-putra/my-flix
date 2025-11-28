import { useSearch, useNavigate } from "@tanstack/react-router";

export default function ClearFilters() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const hasActiveFilters = search.genres || search.rating || search.year;

  const handleClearAll = () => {
    navigate({
      search: {
        page: 1,
        genres: "",
        rating: undefined,
        year: undefined,
      },
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
