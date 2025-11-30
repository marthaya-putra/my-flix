import { useSearch, useNavigate } from "@tanstack/react-router";
import { RatingItems } from "@/lib/types";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";

interface RatingFilterProps {
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof MoviesSearchRoute;
}

export default function RatingFilter({ route }: RatingFilterProps) {
  const search = useSearch({ from: route.id });
  const navigate = useNavigate({ from: route.id } as any);

  const selectedRating = "rating" in search ? search.rating : undefined;

  const handleRatingChange = (newRating?: number) => {
    if ("query" in search) {
      return;
    } else {
      navigate({
        search: {
          page: "page" in search ? search.page : 1,
          genres: "genres" in search ? search.genres : undefined,
          rating: newRating,
          year: "year" in search ? search.year : undefined,
        },
      });
    }
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
