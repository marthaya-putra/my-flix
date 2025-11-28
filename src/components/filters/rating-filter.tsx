import { useSearch, useNavigate } from "@tanstack/react-router";
import { RatingItems } from "@/lib/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function RatingFilter() {
  const search = useSearch({ from: "/movies" });
  const navigate = useNavigate({ from: "/movies" });

  const selectedRating = search.rating || '';

  const handleRatingChange = (newRating: string) => {
    navigate({
      search: {
        page: 1,
        genres: search.genres,
        rating: newRating,
        year: search.year,
      },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
            selectedRating
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary hover:shadow-md"
          }`}
        >
          {selectedRating
            ? `Rating ${RatingItems.find(item => item.value === selectedRating)?.label || selectedRating}+`
            : "Select rating"}
          <span className="ml-2 text-xs">▼</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-56 p-0" align="start">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">Select Rating</h3>
        </div>
        <div className="p-4">
          <div className="space-y-1">
            <label
              className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                !selectedRating ? 'bg-accent/30' : ''
              }`}
            >
              <input
                type="radio"
                name="rating-popover"
                checked={!selectedRating}
                onChange={() => handleRatingChange('')}
                className="h-5 w-5 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
              />
              <span className="text-base text-foreground">All ratings</span>
            </label>
            {RatingItems.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No ratings available
              </div>
            ) : (
              RatingItems.map((item) => (
                <label
                  key={item.value}
                  className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                    selectedRating === item.value ? 'bg-accent/30' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="rating-popover"
                    checked={selectedRating === item.value}
                    onChange={() => handleRatingChange(item.value)}
                    className="h-5 w-5 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <span className="text-base text-foreground">{item.label}+</span>
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}