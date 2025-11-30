import { useNavigate, useSearch } from "@tanstack/react-router";
import Pagination from "@/components/pagination";
import { ReactNode } from "react";

interface SearchContentProps<T> {
  items: Array<T>;
  page: number;
  totalPages: number;
  routePath: string;
  query?: string;
  renderItem: (item: T, index: number) => ReactNode;
  searchParams?: Record<string, any>;
}

export default function SearchContent<T>({
  items,
  page,
  totalPages,
  routePath,
  query,
  renderItem,
  searchParams,
}: SearchContentProps<T>) {
  const navigate = useNavigate({ from: routePath });
  const search = useSearch({ from: routePath });

  const currentPage = page;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = () => {
    const newSearch = query
      ? { query, page: currentPage + 1 }
      : { ...searchParams, page: currentPage + 1 };

    navigate({ search: newSearch });
  };

  const prevPage = () => {
    const newSearch = query
      ? { query, page: currentPage - 1 }
      : { ...searchParams, page: currentPage - 1 };

    navigate({ search: newSearch });
  };

  return (
    <>
      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 my-8">
        {items.map((item, index) => renderItem(item, index))}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        hasNextPage={hasNextPage}
        hasPreviousPage={hasPreviousPage}
        onPrevPage={prevPage}
        onNextPage={nextPage}
      />
    </>
  );
}