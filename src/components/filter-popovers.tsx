import { useState, useEffect, useRef } from "react";
import { genres } from "@/lib/data/movies";
import { RatingItems } from "@/lib/types";

interface FilterPopoversProps {
  selectedGenres: string[];
  selectedRating: string;
  selectedYear: string;
  onGenresChange: (genres: string[]) => void;
  onRatingChange: (rating: string) => void;
  onYearChange: (year: string) => void;
  onClearAll: () => void;
}

export default function FilterPopovers({
  selectedGenres,
  selectedRating,
  selectedYear,
  onGenresChange,
  onRatingChange,
  onYearChange,
  onClearAll,
}: FilterPopoversProps) {
  const [genreOpen, setGenreOpen] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [yearOpen, setYearOpen] = useState(false);

  const genreRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (genreRef.current && !genreRef.current.contains(event.target as Node)) {
        setGenreOpen(false);
      }
      if (ratingRef.current && !ratingRef.current.contains(event.target as Node)) {
        setRatingOpen(false);
      }
      if (yearRef.current && !yearRef.current.contains(event.target as Node)) {
        setYearOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Generate last 10 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const hasActiveFilters = selectedGenres.length > 0 || selectedRating || selectedYear;

  return (
    <div className="bg-white rounded-lg border p-4 mb-8">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Genre Filter Popover */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setGenreOpen(!genreOpen)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedGenres.length > 0
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
              <span className="ml-2">▼</span>
            </button>

            {genreOpen && (
              <div className="absolute top-full left-0 mt-1 w-64 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    {Object.entries(genres).map(([id, name]) => (
                      <label
                        key={id}
                        className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={selectedGenres.includes(id)}
                          onChange={() => {
                            const newGenres = selectedGenres.includes(id)
                              ? selectedGenres.filter(g => g !== id)
                              : [...selectedGenres, id];
                            onGenresChange(newGenres);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Rating Filter Popover */}
          <div className="relative" ref={ratingRef}>
            <button
              onClick={() => setRatingOpen(!ratingOpen)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedRating
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              Rating {selectedRating && `${RatingItems.find(item => item.value === selectedRating)?.label || selectedRating}+`}
              <span className="ml-2">▼</span>
            </button>

            {ratingOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-4">
                  <div className="space-y-2">
                    <label
                      className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                        !selectedRating ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="rating-popover"
                        checked={!selectedRating}
                        onChange={() => onRatingChange('')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">All ratings</span>
                    </label>
                    {RatingItems.map((item) => (
                      <label
                        key={item.value}
                        className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                          selectedRating === item.value ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="rating-popover"
                          checked={selectedRating === item.value}
                          onChange={() => onRatingChange(item.value)}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{item.label}+</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Year Filter Popover */}
          <div className="relative" ref={yearRef}>
            <button
              onClick={() => setYearOpen(!yearOpen)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedYear
                  ? "bg-blue-50 border-blue-300 text-blue-700"
                  : "bg-white border-gray-300 hover:bg-gray-50"
              }`}
            >
              Year {selectedYear && `(${selectedYear})`}
              <span className="ml-2">▼</span>
            </button>

            {yearOpen && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                <div className="p-4 max-h-64 overflow-y-auto">
                  <div className="space-y-2">
                    <label
                      className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                        !selectedYear ? 'bg-blue-50' : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="year-popover"
                        checked={!selectedYear}
                        onChange={() => onYearChange('')}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">All years</span>
                    </label>
                    {years.map((year) => (
                      <label
                        key={year}
                        className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                          selectedYear === String(year) ? 'bg-blue-50' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="year-popover"
                          checked={selectedYear === String(year)}
                          onChange={() => onYearChange(String(year))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">{year}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {hasActiveFilters && (
          <button
            onClick={onClearAll}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
    </div>
  );
}