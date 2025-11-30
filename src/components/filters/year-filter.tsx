import { useSearch, useNavigate } from "@tanstack/react-router";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface YearFilterProps {
  routePath?: "/movies/" | "/tvs/";
}

export default function YearFilter({
  routePath = "/movies/",
}: YearFilterProps) {
  const search = useSearch({ from: routePath }) as {
    page: number;
    genres?: string;
    rating?: number;
    year?: number;
  };
  const navigate = useNavigate({ from: routePath });

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
