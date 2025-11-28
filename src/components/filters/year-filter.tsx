import { useSearch, useNavigate } from "@tanstack/react-router";
import BaseFilter from "./base-filter";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
          <div className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
            <RadioGroupItem value="" id="year-all" />
            <Label htmlFor="year-all">All Years</Label>
          </div>
          {years.map((year) => (
            <div key={year} className="flex items-center space-x-2 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
              <RadioGroupItem
                value={year.toString()}
                id={`year-${year}`}
              />
              <Label htmlFor={`year-${year}`}>{year}</Label>
            </div>
          ))}
        </RadioGroup>
      )}
    </BaseFilter>
  );
}
