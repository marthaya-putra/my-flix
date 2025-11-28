import { useSearch, useNavigate } from "@tanstack/react-router";
import { genres } from "@/lib/data/movies";
import BaseFilter, { type FilterOption } from "./base-filter";

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

  const genreOptions: FilterOption<string>[] = Object.entries(genres).map(([id, name]) => ({
    value: id,
    label: name,
  }));

  return (
    <BaseFilter
      title="Genres"
      placeholder="Select genres"
      options={genreOptions}
      selectedValues={selectedGenres}
      isMultiSelect={true}
      onMultiSelect={handleGenresChange}
    />
  );
}