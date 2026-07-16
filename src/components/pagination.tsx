import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from "@/components/ui/pagination";
import { motion } from "motion/react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  onPrevPage: () => void;
  onNextPage: () => void;
}

const SPRING_TAP = { type: "spring" as const, damping: 1, stiffness: 300 };

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
          <motion.div whileTap={{ scale: 0.95 }} transition={SPRING_TAP}>
            <PaginationPrevious
              onClick={onPrevPage}
              className={
                !hasPreviousPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
              }
              size="default"
            />
          </motion.div>
        </PaginationItem>

        <PaginationItem>
          <span className="flex h-9 w-20 items-center justify-center text-sm font-medium text-muted-foreground rounded-lg backdrop-blur-md bg-black/30 border border-white/10">
            {currentPage} / {totalPages}
          </span>
        </PaginationItem>

        <PaginationItem>
          <motion.div whileTap={{ scale: 0.95 }} transition={SPRING_TAP}>
            <PaginationNext
              onClick={onNextPage}
              className={
                !hasNextPage
                  ? "pointer-events-none opacity-50"
                  : "cursor-pointer hover:bg-accent hover:text-accent-foreground"
              }
              size="default"
            />
          </motion.div>
        </PaginationItem>
      </PaginationContent>
    </Pagination>
  );
}
