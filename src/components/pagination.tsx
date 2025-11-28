import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

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
      <Button
        variant="outline"
        onClick={onPrevPage}
        disabled={!hasPreviousPage}
      >
        <ChevronLeft className="w-4 h-4" />
        Previous
      </Button>

      <span className="text-sm text-gray-600">
        Page {currentPage} of {totalPages}
      </span>

      <Button variant="outline" onClick={onNextPage} disabled={!hasNextPage}>
        Next
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}