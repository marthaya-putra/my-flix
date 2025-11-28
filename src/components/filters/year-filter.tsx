import { useSearch, useNavigate } from "@tanstack/react-router";
import BaseFilter, { type FilterOption } from "./base-filter";

export default function YearFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedYear = search.year;

  const handleYearChange = (newYear?: number) => {
    navigate({
      search: {
        page: 1,
        genres: search.genres,
        rating: search.rating,
        year: newYear,
      },
    });
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const yearOptions: FilterOption<number>[] = years.map((year) => ({
    value: year,
    label: String(year),
  }));

  return (
    <BaseFilter
      title="Year"
      placeholder="Select year"
      options={yearOptions}
      selectedValue={selectedYear}
      onSelect={handleYearChange}
    />
  );
}
