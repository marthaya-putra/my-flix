import { createFileRoute } from "@tanstack/react-router";

// Same-origin proxy for TMDB images.
//
// Why: ParticleScroll's HTML-in-Canvas capture (drawElementImage) drops
// cross-origin images unless they're CORS-clean, and Chrome refuses to
// use cached TMDB responses for a crossOrigin="anonymous" request because
// TMDB doesn't send Vary: Origin. Proxying server-side sidesteps both
// problems: the <img> src is same-origin, our own headers are CORS-clean,
// and there's no cache pollution risk for returning visitors.
//
// Usage: <img src="/api/img/t/p/w500/<file>.jpg" />
// The splat after /api/img is the TMDB path (minus the host).
//
// Server-only deps are dynamically imported so this module — which is
// eagerly imported by routeTree.gen.ts into the client bundle — doesn't
// drag server-side code into the browser.

export const Route = createFileRoute("/api/img/$")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        // pathname looks like /api/img/t/p/w500/<file>.jpg
        const tmdbPath = url.pathname.replace(/^\/api\/img/, "");
        if (!tmdbPath) {
          return new Response("missing path", { status: 400 });
        }
        const upstream = `https://image.tmdb.org${tmdbPath}`;

        let upstreamRes: Response;
        try {
          upstreamRes = await fetch(upstream, {
            // Don't send our visitor's cookies/origin upstream.
            headers: { "user-agent": "my-flix-image-proxy" },
            // Bypass our own SSR fetch cache — we want TMDB's bytes as-is.
            cache: "no-store",
          });
        } catch {
          return new Response("upstream fetch failed", { status: 502 });
        }

        if (!upstreamRes.ok || !upstreamRes.body) {
          return new Response("upstream error", {
            status: upstreamRes.status || 502,
          });
        }

        const headers = new Headers();
        const ct = upstreamRes.headers.get("content-type");
        if (ct) headers.set("content-type", ct);
        // Forward immutability: TMDB images are content-addressed by filename,
        // so they never change. Long cache + immutable.
        headers.set("cache-control", "public, max-age=31536000, immutable");
        // Same-origin responses don't need CORS headers, but set them anyway
        // so a canvas reading these pixels never hits a taint check.
        headers.set("access-control-allow-origin", "*");
        headers.set("vary", "origin");

        return new Response(upstreamRes.body, {
          status: 200,
          headers,
        });
      },
    },
  },
});
