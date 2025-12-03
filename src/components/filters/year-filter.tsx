import { useSearch, useNavigate } from "@tanstack/react-router";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";

interface YearFilterProps {
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof MoviesSearchRoute;
}

export default function YearFilter({ route }: YearFilterProps) {
  const search = useSearch({ from: route.id });
  const navigate = useNavigate({ from: route.path });

  const selectedYear = "year" in search ? search.year : undefined;

  const handleYearChange = (newYear?: number) => {
    if ("query" in search) {
      return;
    } else {
      navigate({
        to: ".",
        search: {
          ...search,
          page: 1,
          year: newYear,
        },
      });
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  return (
    <BaseFilter
      title="Year"
      triggerText={selectedYear ? `Year ${selectedYear}` : "Year"}
      variant={selectedYear ? "default" : "secondary"}
    >
      {({ close }) => (
        <RadioGroup
          value={selectedYear?.toString() || ""}
          onValueChange={(value) => {
            handleYearChange(value === "" ? undefined : Number(value));
            close();
          }}
        >
          <Label
            htmlFor="year-all"
            className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
          >
            <RadioGroupItem value="" id="year-all" />
            <span>All Years</span>
          </Label>
          {years.map((year) => (
            <Label
              htmlFor={`year-${year}`}
              key={year}
              className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors"
            >
              <RadioGroupItem value={year.toString()} id={`year-${year}`} />
              <span>{year}</span>
            </Label>
          ))}
        </RadioGroup>
      )}
    </BaseFilter>
  );
}
