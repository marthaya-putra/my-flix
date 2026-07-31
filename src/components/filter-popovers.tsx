import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import { ReactNode, useState } from "react";
import { cn } from "@/lib/utils";

type FilterPopoversProps = {
  children: ReactNode;
  /**
   * Optional always-visible chips (e.g. active filters). Rendered in the
   * header row so users retain context of active filters even while the
   * popover body is collapsed.
   */
  chips?: ReactNode;
};

export function FilterPopovers({ children, chips }: FilterPopoversProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="bg-card rounded-lg border border-border shadow-sm overflow-hidden transition-[max-height,opacity] duration-300 mb-4">
      <div
        className={cn(
          "flex items-center justify-between gap-4 px-4 py-2",
          !isCollapsed && "border-b border-border",
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-wrap">
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-primary" />
            <h2 className="text-base font-semibold text-foreground">Filters</h2>
          </div>
          {/* Always-visible active-filter chips — context persists while collapsed */}
          {chips && <div className="min-w-0">{chips}</div>}
        </div>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="flex items-center gap-2 px-3 py-1 text-sm text-muted-foreground hover:text-foreground transition-colors duration-200 hover:bg-accent/50 rounded-md shrink-0"
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
        className={cn(
          "transition-[max-height,opacity] duration-300 ease-in-out",
          isCollapsed ? "max-h-0 opacity-0" : "max-h-96 opacity-100",
        )}
      >
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}
