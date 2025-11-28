import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}

function PaginationButton({ onClick, disabled, children }: PaginationButtonProps) {
  const isNext = children?.toString().includes("Next");

  return (
    <Button
      variant="outline"
      onClick={onClick}
      disabled={disabled}
      className="hover:bg-gray-50/50 transition-colors hover:[&_svg]:animate-sliding"
      style={{ "--slide-animation-from": isNext ? "-4px" : "4px" } as React.CSSProperties}
    >
      {children}
    </Button>
  );
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function Pagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPrevPage,
  onNextPage,
}: PaginationProps) {
  return (
    <div className="flex justify-center items-center gap-4">
      <PaginationButton onClick={onPrevPage} disabled={!hasPreviousPage}>
        <ChevronLeft className="w-4 h-4" />
        Previous
      </PaginationButton>

      <span className="text-sm text-foreground font-medium">
        {currentPage} / {totalPages}
      </span>

      <PaginationButton onClick={onNextPage} disabled={!hasNextPage}>
        Next
        <ChevronRight className="w-4 h-4" />
      </PaginationButton>
    </div>
  );
}