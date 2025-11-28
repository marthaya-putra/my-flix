import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";

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
        <Button
          variant={isMultiSelect ? (selectedValues.length > 0 ? "default" : "secondary") : selectedValue ? "default" : "secondary"}
          className="font-medium"
        >
          {displayValue}
          <span className="ml-2 text-xs">▼</span>
        </Button>
      </PopoverTrigger>

      <PopoverContent className={`w-${isMultiSelect ? '72' : '56'} p-0`} align="start">
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          <div className="space-y-1">
            {options.length === 0 ? (
              <div className="text-sm text-muted-foreground p-2 text-center">
                No {title.toLowerCase()} available
              </div>
            ) : (
              <>
                {isMultiSelect ? (
                  // Multi-select mode with checkboxes
                  <>
                    {options.map((option) => (
                      <div key={String(option.value)} className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
                        <Checkbox
                          id={`${title.toLowerCase()}-${option.value}`}
                          checked={selectedValues.includes(option.value)}
                          onCheckedChange={() => handleMultiSelect(option.value)}
                        />
                        <Label htmlFor={`${title.toLowerCase()}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </>
                ) : (
                  // Single-select mode with radio group
                  <RadioGroup value={selectedValue?.toString() || ""} onValueChange={(value) => onSelect?.(value === "" ? undefined : (value as T))}>
                    <div className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
                      <RadioGroupItem value="" id={`${title.toLowerCase()}-all`} />
                      <Label htmlFor={`${title.toLowerCase()}-all`}>All {title.toLowerCase()}</Label>
                    </div>
                    {options.map((option) => (
                      <div key={String(option.value)} className="flex items-center space-x-3 cursor-pointer hover:bg-accent/50 p-2 rounded-md transition-colors">
                        <RadioGroupItem
                          value={String(option.value)}
                          id={`${title.toLowerCase()}-${option.value}`}
                        />
                        <Label htmlFor={`${title.toLowerCase()}-${option.value}`}>{option.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}