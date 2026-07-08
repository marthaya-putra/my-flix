import { createFileRoute } from "@tanstack/react-router";

// Spec 0006: manual NDJSON streaming transport. Replaces the TanStack
// async-generator RPC (getRecommendationsStream) whose chunk-boundary
// deserializer dropped trailing frames when two JSON objects landed in one
// read() chunk. This route owns the byte stream: each StreamEvent is one
// JSON object followed by "\n". The client reads response.body, splits on
// "\n", and JSON.parses each line independently — no dependency on the
// framework's framer.
//
// Same StreamEvent contract, same groupStart/item/groupEnd semantics, same
// pipeline (runPipelines). Only the outer transport changes.
//
// Server-authoritative prefs: the route loads userPrefs from the DB via
// loadUserContent(userId). The client sends ONLY previousRecommendations
// (transient shown-not-yet-liked state) — never a userPrefs copy, so the
// exclude set can't be spoofed or drift stale.
//
// IMPORTANT: server-only deps (auth, drizzle/postgres, ai-sdk) are loaded
// via dynamic import INSIDE the handler. The route module is eagerly
// imported by routeTree.gen.ts into the client bundle; top-level static
// imports of these would drag Buffer/postgres into the browser and throw
// "Buffer is not defined". Dynamic import keeps them server-evaluated only.

// Spec 0006: manual NDJSON streaming transport. Replaces the TanStack
// async-generator RPC (getRecommendationsStream) whose chunk-boundary
// deserializer dropped trailing frames when two JSON objects landed in one
// read() chunk. This route owns the byte stream: each StreamEvent is one
// JSON object followed by "\n". The client reads response.body, splits on
// "\n", and JSON.parses each line independently — no dependency on the
// framework's framer.
//
// Same StreamEvent contract, same groupStart/item/groupEnd semantics, same
// pipeline (runPipelines). Only the outer transport changes.
//
// Server-authoritative prefs: the route loads userPrefs from the DB via
// loadUserContent(userId). The client sends ONLY previousRecommendations
// (transient shown-not-yet-liked state) — never a userPrefs copy, so the
// exclude set can't be spoofed or drift stale.

export const Route = createFileRoute("/api/recommendations/stream")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Dynamic import: keeps auth/drizzle/postgres out of the client
        // bundle (this route module is eagerly imported by routeTree).
        const { getRequest } = await import("@tanstack/react-start/server");
        const { auth } = await import("@/lib/auth");
        const { loadUserContent } = await import("@/lib/data/preferences-server");
        const { runPipelines, streamRequestSchema } = await import(
          "@/lib/data/recommendations"
        );

        // Auth: same read path as getAllUserContent / other server fns.
        const session = await auth.api.getSession({
          headers: getRequest().headers,
        });
        if (!session?.user?.id) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "content-type": "application/json" },
          });
        }

        // Parse JSON body. A malformed body is a client bug — 400, no stream.
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid json body" }), {
            status: 400,
            headers: { "content-type": "application/json" },
          });
        }

        // Validate the wire payload (previousRecommendations only).
        const parsed = streamRequestSchema.safeParse(body);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: parsed.error.message }),
            { status: 400, headers: { "content-type": "application/json" } }
          );
        }

        // Load prefs authoritatively from the DB. No client trust.
        const userPrefs = await loadUserContent(session.user.id);

        const encoder = new TextEncoder();
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            try {
              // Each yielded StreamEvent becomes one self-delimited
              // NDJSON line. raceMerge guarantees groupStart×2 up front,
              // interleaved items, and exactly one groupEnd per category.
              for await (const evt of runPipelines({
                userPrefs,
                previousRecommendations: parsed.data.previousRecommendations,
              })) {
                controller.enqueue(
                  encoder.encode(JSON.stringify(evt) + "\n")
                );
              }
            } catch (error: any) {
              // Pipeline throws are normally converted to
              // groupEnd{generation_failed} inside backfillCategory, so we
              // rarely land here. If we do, emit terminal groupEnds for
              // both categories so the client's reader sees a clean
              // end-of-stream instead of a truncated body.
              console.error("[stream] pipeline fatal:", error);
              const fail = (category: "movie" | "tv") => ({
                type: "groupEnd" as const,
                category,
                status: "generation_failed" as const,
                error: "Stream failed.",
              });
              try {
                controller.enqueue(
                  encoder.encode(JSON.stringify(fail("movie")) + "\n")
                );
                controller.enqueue(
                  encoder.encode(JSON.stringify(fail("tv")) + "\n")
                );
              } catch {
                /* controller already closed */
              }
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          status: 200,
          headers: {
            "content-type": "application/x-ndjson; charset=utf-8",
            "cache-control": "no-store, no-transform",
            "x-accel-buffering": "no",
          },
        });
      },
    },
  },
});
