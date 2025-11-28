import { useSearch, useNavigate } from "@tanstack/react-router";
import { RatingItems } from "@/lib/types";
import BaseFilter, { type FilterOption } from "./base-filter";

export default function RatingFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedRating = search.rating;

  const handleRatingChange = (newRating?: number) => {
    navigate({
      search: {
        page: 1,
        genres: search.genres,
        rating: newRating,
        year: search.year,
      },
    });
  };

  const ratingOptions: FilterOption<number>[] = RatingItems.map((item) => ({
    value: item.value,
    label: item.label,
  }));

  return (
    <BaseFilter
      title="Rating"
      placeholder="Select rating"
      options={ratingOptions}
      selectedValue={selectedRating}
      onSelect={handleRatingChange}
    />
  );
}