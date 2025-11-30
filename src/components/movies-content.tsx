import { useNavigate, useSearch } from "@tanstack/react-router";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/pagination";
import { DiscoverResult } from "@/lib/types";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";

interface MoviesContentProps {
  moviesData: DiscoverResult;
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof MoviesSearchRoute;
}

export default function MoviesContent({
  moviesData,
  route,
}: MoviesContentProps) {
  const navigate = useNavigate({ from: route.id } as any);
  const search = useSearch({
    from: route.id,
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
    if (query) {
      navigate({
        search: {
          query,
          page: currentPage + 1,
        },
      });
    } else {
      navigate({
        search: {
          page: currentPage + 1,
          genres,
          rating,
          year,
        },
      });
    }
  };

  const prevPage = () => {
    if (query) {
      navigate({
        search: {
          query,
          page: currentPage - 1,
        },
      });
    } else {
      navigate({
        search: {
          page: currentPage - 1,
          genres,
          rating,
          year,
        },
      });
    }
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
