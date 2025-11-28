import { createServerFn } from "@tanstack/react-start";
import { fetchFromTMDB } from "./tmdb";

export const genres: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Science Fiction",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export const fetchTrendingMovies = createServerFn({
  method: "GET",
})
  .inputValidator((timeWindow: "day" | "week" = "week") => timeWindow)
  .handler(({ data }) => {
    return fetchFromTMDB(`/trending/movie/${data}`);
  });

export const fetchPopularMovies = createServerFn({
  method: "GET",
})
  .inputValidator((page: string = "1") => page)
  .handler(({ data }) => {
    return fetchFromTMDB(
      `/movie/popular?language=en-US&region=US&page=${data}`
    );
  });

export const fetchDiscoverMovies = createServerFn({
  method: "GET",
})
  .inputValidator(
    (params: {
      page: string;
      with_genres?: string;
      vote_average_gte?: string;
      year?: number;
    }) => params
  )
  .handler(({ data }) => {
    const today = new Date().toISOString().split("T")[0];
    const queryParams = new URLSearchParams();

    queryParams.append("page", data.page);
    queryParams.append("primary_release_date.lte", today);
    queryParams.append("include_adult", "true");
    queryParams.append("sort_by", "primary_release_date.desc");

    if (
      data.with_genres &&
      typeof data.with_genres === "string" &&
      data.with_genres.trim()
    ) {
      queryParams.append("with_genres", data.with_genres);
    }

    if (
      data.vote_average_gte &&
      typeof data.vote_average_gte === "string" &&
      data.vote_average_gte.trim()
    ) {
      queryParams.append("vote_average.gte", data.vote_average_gte);
    }

    if (data.year) {
      queryParams.append("year", String(data.year));
    }

    return fetchFromTMDB(`/discover/movie?${queryParams.toString()}`);
  });
