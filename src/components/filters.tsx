import { genres } from "@/lib/data/movies";
import { RatingItems } from "@/lib/types";

interface FiltersProps {
  selectedGenres: string[];
  selectedRating: string;
  selectedYear: string;
  onGenresChange: (genres: string[]) => void;
  onRatingChange: (rating: string) => void;
  onYearChange: (year: string) => void;
  onClearFilters: () => void;
}

export default function Filters({
  selectedGenres,
  selectedRating,
  selectedYear,
  onGenresChange,
  onRatingChange,
  onYearChange,
  onClearFilters,
}: FiltersProps) {
  // Generate last 10 years
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - i);

  const handleGenreChange = (genreId: string) => {
    const newGenres = selectedGenres.includes(genreId)
      ? selectedGenres.filter(g => g !== genreId)
      : [...selectedGenres, genreId];
    onGenresChange(newGenres);
  };

  const hasActiveFilters = selectedGenres.length > 0 || selectedRating || selectedYear;

  return (
    <div className="bg-white rounded-lg border p-6 mb-8">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={onClearFilters}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear all
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Genre Multi-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Genres
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {Object.entries(genres).map(([id, name]) => (
              <label
                key={id}
                className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedGenres.includes(id)}
                  onChange={() => handleGenreChange(id)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Rating Single-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Rating
          </label>
          <div className="space-y-2">
            <label
              className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                !selectedRating ? 'bg-blue-50' : ''
              }`}
            >
              <input
                type="radio"
                name="rating"
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
                  name="rating"
                  checked={selectedRating === item.value}
                  onChange={() => onRatingChange(item.value)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{item.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Year Single-Select */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Year
          </label>
          <div className="space-y-2">
            <label
              className={`flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded ${
                !selectedYear ? 'bg-blue-50' : ''
              }`}
            >
              <input
                type="radio"
                name="year"
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
                  name="year"
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
    </div>
  );
}