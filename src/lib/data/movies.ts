import { createServerFn } from "@tanstack/react-start";
import { fetchFromTMDB } from "./tmdb";

export const fetchTrendingMovies = createServerFn({
  method: "GET",
})
  .inputValidator((timeWindow: "day" | "week" = "week") => timeWindow)
  .handler(({ data }) => {
    return fetchFromTMDB(`/trending/movie/${data}`);
  });
