import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ReactNode, useState } from "react";

export type FilterOption<T = string | number> = {
  value: T;
  label: string;
};

export type BaseFilterProps = {
  title: string;
  children: ReactNode | ((props: {
    close: () => void;
  }) => ReactNode);
  trigger?: (props: { isOpen: boolean }) => ReactNode;
  triggerText?: string;
  variant?: "default" | "secondary" | "destructive" | "outline" | "ghost" | "link";
  contentClassName?: string;
  align?: "start" | "center" | "end";
};

export default function BaseFilter({
  title,
  children,
  trigger,
  triggerText = title,
  variant = "secondary",
  contentClassName = "w-56 p-0",
  align = "start",
}: BaseFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const close = () => setIsOpen(false);

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        {trigger ? (
          trigger({ isOpen })
        ) : (
          <Button variant={variant} className="font-medium">
            {triggerText}
            <span className="ml-2 text-xs">▼</span>
          </Button>
        )}
      </PopoverTrigger>

      <PopoverContent className={contentClassName} align={align}>
        <div className="border-b border-border px-4 py-3">
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
        <div className="p-4 max-h-64 overflow-y-auto">
          {typeof children === 'function' ? children({ close }) : children}
        </div>
      </PopoverContent>
    </Popover>
  );
}