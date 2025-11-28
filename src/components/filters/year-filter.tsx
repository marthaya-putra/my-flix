import { useSearch, useNavigate } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function YearFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedYear = search.year || undefined;

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
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
            selectedYear
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary hover:shadow-md"
          }`}
        >
          {selectedYear ? `Year (${selectedYear})` : "Select year"}
          <span className="ml-2 text-xs">▼</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">Select Year</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-1">
            <label
              className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                !selectedYear ? "bg-accent/30" : ""
              }`}
            >
              <input
                type="radio"
                name="year-popover"
                checked={!selectedYear}
                onChange={() => handleYearChange(undefined)}
                className="h-5 w-5 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              />
              <span className="text-base text-foreground">All years</span>
            </label>
            {years.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No years available
              </div>
            ) : (
              years.map((year) => (
                <label
                  key={year}
                  className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                    selectedYear === year ? "bg-accent/30" : ""
                  }`}
                >
                  <input
                    type="radio"
                    name="year-popover"
                    checked={selectedYear === year}
                    onChange={() => handleYearChange(year)}
                    className="h-5 w-5 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <span className="text-base text-foreground">{year}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
