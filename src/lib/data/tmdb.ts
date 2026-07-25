import { DiscoverResult } from "../types";
import { convertToDiscoverResult } from "../utils";

const TMDB_URL = "https://api.themoviedb.org/3";
// Same-origin proxy (src/routes/api/img/$.ts). ParticleScroll's
// HTML-in-Canvas capture drops cross-origin images unless CORS-clean, and
// Chrome can't reuse cached TMDB responses for crossOrigin="anonymous" because
// TMDB omits Vary: Origin — so proxy through our own origin instead.
// The path after /api/img mirrors the TMDB path (e.g. /t/p/w500/<file>.jpg).
export const TMDB_IMAGE_BASE = "/api/img/t/p/w500";

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
