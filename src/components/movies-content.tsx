import { useNavigate, useSearch } from "@tanstack/react-router";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/pagination";
import { DiscoverResult } from "@/lib/types";

interface MoviesContentProps {
  moviesData: DiscoverResult;
  routePath?: "/movies" | "/tvs";
}

export default function MoviesContent({
  moviesData,
  routePath = "/movies",
}: MoviesContentProps) {
  const navigate = useNavigate({ from: routePath });
  const { genres, rating, year } = useSearch({ from: routePath }) as {
    page: number;
    genres?: string;
    rating?: number;
    year?: number;
  };

  const currentPage = moviesData.page;
  const totalPages = moviesData.totalPages;
  const hasNextPage = currentPage < totalPages;
  const hasPreviousPage = currentPage > 1;

  const nextPage = () => {
    navigate({
      search: {
        page: currentPage + 1,
        genres,
        rating,
        year,
      },
    });
  };

  const prevPage = () => {
    navigate({
      search: {
        page: currentPage - 1,
        genres,
        rating,
        year,
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

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 my-8">
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
