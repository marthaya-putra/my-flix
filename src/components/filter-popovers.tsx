import { useState } from "react";
import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { ReactNode } from "react";

interface FilterPopoversProps {
  children: ReactNode;
}

export default function FilterPopovers({ children }: FilterPopoversProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <div className="bg-card rounded-lg border border-border shadow-lg relative z-40 overflow-hidden transition-all duration-300 mb-8">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Filters</h2>
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-accent/50 rounded-md"
          aria-label={isCollapsed ? "Expand filters" : "Collapse filters"}
        >
          <span>{isCollapsed ? "Show" : "Hide"}</span>
          {isCollapsed ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronUp className="w-4 h-4" />
          )}
        </button>
      </div>

      <div
        className={`transition-all duration-300 ease-in-out ${
          isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100"
        }`}
      >
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
}
