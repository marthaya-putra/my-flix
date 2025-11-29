import { createServerFn } from "@tanstack/react-start";
import { fetchFromTMDB } from "./tmdb";
import { DiscoverResult } from "../types";

export const genres: Record<number, string> = {
  10759: "Action & Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  10762: "Kids",
  9648: "Mystery",
  10763: "News",
  10764: "Reality",
  10765: "Sci-Fi & Fantasy",
  10766: "Soap",
  10767: "Talk",
  10768: "War & Politics",
  37: "Western",
};

export const fetchTrendingTvs = createServerFn({
  method: "GET",
})
  .inputValidator((timeWindow: "day" | "week" = "week") => timeWindow)
  .handler(({ data }) => {
    return fetchFromTMDB(`/trending/tv/${data}`);
  });

export const fetchAiringTodayTvs = createServerFn({
  method: "GET",
})
  .handler(() => {
    return fetchFromTMDB("/tv/airing_today");
  });

export const fetchOnTheAirTvs = createServerFn({
  method: "GET",
})
  .handler(() => {
    return fetchFromTMDB("/tv/on_the_air");
  });

export const fetchDiscoverTvs = createServerFn({
  method: "GET",
})
  .inputValidator(
    (params: {
      page: string;
      with_genres?: string;
      vote_average_gte?: number;
      year?: number;
    }) => params
  )
  .handler(({ data }) => {
    const queryParams = new URLSearchParams();
    const today = new Date().toISOString().split("T")[0];

    queryParams.set("page", data.page);
    queryParams.set("include_adult", "true");
    queryParams.set("sort_by", "first_air_date.desc");
    queryParams.set("watch_region", "US");
    queryParams.set("air_date.lte", `${today}`);

    if (
      data.with_genres &&
      typeof data.with_genres === "string" &&
      data.with_genres.trim()
    ) {
      queryParams.set("with_genres", data.with_genres);
    }

    if (data.vote_average_gte) {
      queryParams.set("vote_average.gte", String(data.vote_average_gte));
    }

    if (data.year) {
      queryParams.set("air_date.gte", `${String(data.year)}-01-01`);
      queryParams.set("air_date.lte", `${String(data.year)}-12-31`);
    }

    return fetchFromTMDB(
      `/discover/tv?${queryParams.toString()}`
    ) as Promise<DiscoverResult>;
  });
