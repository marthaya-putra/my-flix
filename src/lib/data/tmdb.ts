import { DiscoverResult } from "../types";
import { convertToDiscoverResult } from "../utils";

const TMDB_URL = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500";

export async function fetchFromTMDB(
  path: URL | RequestInfo,
  options?: RequestInit
): Promise<any> {
  let headers = {
    accept: "application/json",
    authorization: `Bearer ${process.env.TMDB_TOKEN}`,
  };

  let otherOptions;

  if (options) {
    const { headers: optionHeaders, ...restOptions } = options;
    headers = { ...headers, ...optionHeaders };
    otherOptions = restOptions;
  }

  const res = await fetch(`${TMDB_URL}${path}`, {
    headers,
    ...otherOptions,
  });

  const data = await res.json();
  return data;
}
