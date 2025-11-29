import { useNavigate, useSearch } from "@tanstack/react-router";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/pagination";
import { DiscoverResult } from "@/lib/types";
import { Route as MoviesRoute } from "@/routes/movies";
import { Route as TvsRoute } from "@/routes/tvs";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs-airing-today";

interface MoviesContentProps {
  moviesData: DiscoverResult;
  route: typeof MoviesRoute | typeof TvsRoute | typeof TvsAiringTodayRoute;
}

export default function MoviesContent({
  moviesData,
  route,
}: MoviesContentProps) {
  const navigate = useNavigate({ from: route.id });
  const search = useSearch({
    from: route.id,
  });

  const genres = "genres" in search ? search.genres : undefined;
  const rating = "rating" in search ? search.rating : undefined;
  const year = "year" in search ? search.year : undefined;

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
