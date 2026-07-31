import { useNavigate, useSearch } from "@tanstack/react-router";
import { X } from "lucide-react";
import { RatingItems } from "@/lib/types";

type ActiveFilterChipsProps = {
  from: "/movies/" | "/tvs/";
  /** genre id → label map (MOVIE_GENRES or TV_GENRES). */
  genreMap: Record<number, string>;
};

/**
 * Removable chips for the currently active discover filters. Always visible
 * in the FilterPopovers header, so users keep context of active filters even
 * while the popover body is collapsed (regression introduced by hiding the
 * filter bar by default). Mirrors the search-reading pattern in
 * clear-filters.tsx; removing a chip updates the search params and resets to
 * page 1, identical to toggling the filter off in its own popover.
 */
export function ActiveFilterChips({ from, genreMap }: ActiveFilterChipsProps) {
  const navigate = useNavigate({ from });
  const search = useSearch({ from });

  const genres = "genres" in search ? search.genres : undefined;
  const rating = "rating" in search ? search.rating : undefined;
  const year = "year" in search ? search.year : undefined;

  const selectedGenreIds =
    typeof genres === "string" && genres ? genres.split(",") : [];
  const ratingLabel = rating
    ? RatingItems.find((item) => item.value === rating)?.label
    : undefined;

  const chips: Array<{ key: string; label: string; remove: () => void }> = [];

  for (const id of selectedGenreIds) {
    const label = genreMap[Number(id)];
    if (!label) continue;
    chips.push({
      key: `genre-${id}`,
      label,
      remove: () =>
        navigate({
          to: ".",
          search: (prev) => ({
            ...prev,
            page: 1,
            genres:
              selectedGenreIds.filter((g) => g !== id).join(",") || undefined,
          }),
        }),
    });
  }

  if (ratingLabel) {
    chips.push({
      key: `rating-${rating}`,
      label: `Rating ${ratingLabel}+`,
      remove: () =>
        navigate({
          to: ".",
          search: (prev) => ({ ...prev, page: 1, rating: undefined }),
        }),
    });
  }

  if (year) {
    chips.push({
      key: `year-${year}`,
      label: String(year),
      remove: () =>
        navigate({
          to: ".",
          search: (prev) => ({ ...prev, page: 1, year: undefined }),
        }),
    });
  }

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.remove}
          className="group inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary transition-colors hover:bg-primary/20"
        >
          {chip.label}
          <X className="w-3 h-3 opacity-70 group-hover:opacity-100" />
        </button>
      ))}
    </div>
  );
}
