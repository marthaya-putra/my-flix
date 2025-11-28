import { createServerFn } from "@tanstack/react-start";
import { fetchFromTMDB } from "./tmdb";

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
