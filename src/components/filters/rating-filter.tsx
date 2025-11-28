import { useSearch, useNavigate } from "@tanstack/react-router";
import { RatingItems } from "@/lib/types";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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

  const selectedRatingLabel = selectedRating
    ? RatingItems.find((item) => item.value === selectedRating)?.label
    : undefined;

  return (
    <BaseFilter
      title="Rating"
      triggerText={
        selectedRatingLabel ? `Rating ${selectedRatingLabel}+` : "Rating"
      }
      variant={selectedRating ? "default" : "secondary"}
    >
      {({ close }) => (
        <RadioGroup
          value={selectedRating?.toString() || ""}
          onValueChange={(value) => {
            handleRatingChange(value === "" ? undefined : Number(value));
            close();
          }}
        >
          <Label
            htmlFor="rating-all"
            className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
          >
            <RadioGroupItem value="" id="rating-all" />
            <span>All Ratings</span>
          </Label>
          {RatingItems.map((item) => (
            <Label
              htmlFor={`rating-${item.value}`}
              key={item.value}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            >
              <RadioGroupItem
                value={item.value.toString()}
                id={`rating-${item.value}`}
              />
              <span>{item.label}+</span>
            </Label>
          ))}
        </RadioGroup>
      )}
    </BaseFilter>
  );
}
