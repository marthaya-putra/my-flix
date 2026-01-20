import { useNavigate, useSearch } from "@tanstack/react-router";
import MovieCard from "@/components/movie-card";
import Pagination from "@/components/pagination";
import { DiscoverResult, FilmInfo } from "@/lib/types";
import { Route as MoviesRoute } from "@/routes/movies.index";
import { Route as TvsRoute } from "@/routes/tvs.index";
import { Route as TvsAiringTodayRoute } from "@/routes/tvs.airing-today";
import { Route as TvsAiringThisWeekRoute } from "@/routes/tvs.airing-this-week";
import { Route as MoviesSearchRoute } from "@/routes/movies.search";
import { Route as TvsSearchRoute } from "@/routes/tvs.search";

interface MoviesContentProps {
  moviesData: DiscoverResult;
  route:
    | typeof MoviesRoute
    | typeof TvsRoute
    | typeof TvsAiringTodayRoute
    | typeof TvsAiringThisWeekRoute
    | typeof MoviesSearchRoute
    | typeof TvsSearchRoute;
  isLiked?: (id: number) => boolean;
  onToggleLike?: (filmInfo: FilmInfo) => void;
}

export default function MoviesContent({
  moviesData,
  route,
  isLiked,
  onToggleLike,
}: MoviesContentProps) {
  const navigate = useNavigate({ from: route.path });
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
          <MovieCard
            key={movie.id}
            {...movie}
            isLiked={isLiked?.(movie.id)}
            onToggleLike={onToggleLike}
          />
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
