import { useNavigate, useSearch } from "@tanstack/react-router";
import { Clapperboard } from "lucide-react";
import { motion } from "motion/react";
import { MovieCard } from "@/components/movie-card";
import { CustomPagination as Pagination } from "@/components/pagination";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { fadeUpContainer, fadeUpItem } from "@/lib/motion";
import { DiscoverResult } from "@/lib/types";

type MoviesContentProps = {
  moviesData: DiscoverResult;
  from:
    | "/movies/"
    | "/tvs/"
    | "/tvs/airing-today"
    | "/tvs/airing-this-week"
    | "/movies/search"
    | "/tvs/search";
};

export function MoviesContent({ moviesData, from }: MoviesContentProps) {
  const navigate = useNavigate({ from });
  const search = useSearch({
    from,
  });

  const currentPage = moviesData.page;
  const totalPages = moviesData.totalPages;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = () => {
    navigate({
      search: {
        ...search,
        page: currentPage + 1,
      },
    });
  };

  const prevPage = () => {
    navigate({
      search: {
        ...search,
        page: currentPage - 1,
      },
    });
  };

  const hasResults = moviesData.results.length > 0;
  // Re-run the entrance when the result set changes (page or active filters).
  const staggerKey = [
    currentPage,
    "genres" in search ? search.genres : "",
    "rating" in search ? search.rating : "",
    "year" in search ? search.year : "",
    "query" in search ? search.query : "",
  ].join("|");

  // "Clear filters" only makes sense on the discover routes that expose filters.
  const supportsClearFilters = from === "/movies/" || from === "/tvs/";

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

      {hasResults ? (
        // Bounded staggered entrance (fadeUp presets, no overshoot). Re-keys on
        // navigation so paging / filtering re-reveals the grid. Reduced-motion
        // is honored globally via <MotionConfig reducedMotion="user">.
        <motion.div
          key={staggerKey}
          variants={fadeUpContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 my-8 max-w-[1010px] mx-auto"
        >
          {moviesData.results.map((movie) => (
            <motion.div key={movie.id} variants={fadeUpItem}>
              <MovieCard {...movie} />
            </motion.div>
          ))}
        </motion.div>
      ) : (
        <div className="my-12 max-w-[1010px] mx-auto">
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Clapperboard />
              </EmptyMedia>
              <EmptyTitle>No titles found</EmptyTitle>
              <EmptyDescription>
                Try adjusting your {supportsClearFilters ? "filters" : "search"}{" "}
                to find something to watch.
              </EmptyDescription>
            </EmptyHeader>
            {supportsClearFilters && (
              <EmptyContent>
                <Button
                  variant="secondary"
                  onClick={() => navigate({ search: undefined })}
                >
                  Clear filters
                </Button>
              </EmptyContent>
            )}
          </Empty>
        </div>
      )}

      {hasResults && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPreviousPage={hasPreviousPage}
          onPrevPage={prevPage}
          onNextPage={nextPage}
        />
      )}
    </>
  );
}
