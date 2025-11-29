import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

export default function CustomPagination({
  currentPage,
  totalPages,
  hasNextPage,
  hasPreviousPage,
  onPrevPage,
  onNextPage,
}: PaginationProps) {
  return (
    <Pagination>
      <PaginationContent>
        <PaginationItem>
          <PaginationPrevious
            onClick={onPrevPage}
            className={!hasPreviousPage ? "pointer-events-none opacity-50" : "cursor-pointer hover:[&_svg]:animate-sliding hover:bg-accent hover:text-accent-foreground"}
            style={{ "--slide-animation-from": "4px" } as React.CSSProperties}
            size="default"
          />
        </PaginationItem>

        <PaginationItem>
          <span className="flex h-9 w-20 items-center justify-center text-sm font-medium text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
        </PaginationItem>

        <PaginationItem>
          <PaginationNext
            onClick={onNextPage}
            className={!hasNextPage ? "pointer-events-none opacity-50" : "cursor-pointer hover:[&_svg]:animate-sliding hover:bg-accent hover:text-accent-foreground"}
            style={{ "--slide-animation-from": "-4px" } as React.CSSProperties}
            size="default"
          />
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}