import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export type FilterOption<T = string | number> = {
  value: T;
  label: string;
};

export type BaseFilterProps<T = string | number> = {
  title: string;
  placeholder: string;
  options: FilterOption<T>[];
  selectedValue?: T;
  selectedValues?: T[];
  isMultiSelect?: boolean;
  onSelect?: (value: T | undefined) => void;
  onMultiSelect?: (values: T[]) => void;
};

export default function BaseFilter<T = string>({
  title,
  placeholder,
  options,
  selectedValue,
  selectedValues = [],
  isMultiSelect = false,
  onSelect,
  onMultiSelect,
}: BaseFilterProps<T>) {
  const displayValue = isMultiSelect
    ? selectedValues.length > 0
      ? `${title} (${selectedValues.length})`
      : placeholder
    : selectedValue
    ? `${title} ${options.find(opt => opt.value === selectedValue)?.label || selectedValue}${typeof selectedValue === 'string' && !isNaN(Number(selectedValue)) ? '' : '+'}`
    : placeholder;

  const handleMultiSelect = (value: T) => {
    if (!onMultiSelect) return;

    const newValues = selectedValues.includes(value)
      ? selectedValues.filter(v => v !== value)
      : [...selectedValues, value];

    onMultiSelect(newValues);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={`px-4 py-2 rounded-lg border transition-all duration-200 font-medium ${
            (isMultiSelect ? selectedValues.length > 0 : selectedValue)
              ? "bg-primary text-primary-foreground border-primary shadow-lg"
              : "bg-secondary/50 text-secondary-foreground border-border hover:bg-secondary hover:shadow-md"
          }`}
        >
          {displayValue}
          <span className="ml-2 text-xs">▼</span>
        </button>
      </PopoverTrigger>

      <PopoverContent className={`w-${isMultiSelect ? '72' : '56'} p-0`} align="start">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {!isMultiSelect && (
              <label
                className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                  !selectedValue ? "bg-accent/30" : ""
                }`}
              >
                <input
                  type="radio"
                  name={`${title.toLowerCase()}-popover`}
                  checked={!selectedValue}
                  onChange={() => onSelect?.(undefined)}
                  className="h-5 w-5 text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                />
                <span className="text-base text-foreground">All {title.toLowerCase()}</span>
              </label>
            )}

            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No {title.toLowerCase()} available
              </div>
            ) : (
              options.map((option) => (
                <label
                  key={String(option.value)}
                  className={`flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors ${
                    (isMultiSelect ? selectedValues.includes(option.value) : selectedValue === option.value)
                      ? "bg-accent/30"
                      : ""
                  }`}
                >
                  <input
                    type={isMultiSelect ? "checkbox" : "radio"}
                    name={isMultiSelect ? undefined : `${title.toLowerCase()}-popover`}
                    checked={isMultiSelect ? selectedValues.includes(option.value) : selectedValue === option.value}
                    onChange={() => isMultiSelect ? handleMultiSelect(option.value) : onSelect?.(option.value)}
                    className="h-5 w-5 rounded border-border text-primary bg-background focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
                  />
                  <span className="text-base text-foreground">{option.label}</span>
                </label>
              ))
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}