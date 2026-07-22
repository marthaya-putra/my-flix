import { useSearch, useNavigate } from "@tanstack/react-router";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

interface YearFilterProps {
  from: "/movies/" | "/tvs/" | "/tvs/airing-today" | "/movies/search";
}

export default function YearFilter({ from }: YearFilterProps) {
  const search = useSearch({ from });
  const navigate = useNavigate({ from });

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
