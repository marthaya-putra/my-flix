import { useNavigate, useSearch } from "@tanstack/react-router";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/pagination";
import { DiscoverResult } from "@/lib/types";

interface MoviesContentProps {
  moviesData: DiscoverResult;
  from:
    | "/movies/"
    | "/tvs/"
    | "/tvs/airing-today"
    | "/tvs/airing-this-week"
    | "/movies/search"
    | "/tvs/search";
}

export default function MoviesContent({
  moviesData,
  from,
}: MoviesContentProps) {
  const navigate = useNavigate({ from });
  const search = useSearch({
    from,
  });

  const genres = "genres" in search ? search.genres : undefined;
  const rating = "rating" in search ? search.rating : undefined;
  const year = "year" in search ? search.year : undefined;
  const query = "query" in search ? search.query : undefined;

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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 my-8">
        {moviesData.results.map((movie) => (
          <MovieCard key={movie.id} {...movie} />
        ))}
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
