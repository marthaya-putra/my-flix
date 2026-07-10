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
        const { runPipelines, streamRequestSchema, resolveCategories } = await import(
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

        // Resolve requested categories once so both the success and error
        // paths agree on the same deduped list.
        const requestedCategories = resolveCategories(parsed.data.categories);

        // Load prefs authoritatively from the DB. No client trust.
        const userPrefs = await loadUserContent(session.user.id);

        const encoder = new TextEncoder();
        // Track whether the client has disconnected (abort/navigation). When
        // it has, the stream controller is closed and enqueue() would throw
        // ERR_INVALID_STATE ("Controller is already closed"). We stop draining
        // the generator instead of crashing into the catch.
        let clientGone = false;
        const onAbort = () => {
          clientGone = true;
        };
        request.signal.addEventListener("abort", onAbort);
        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const enqueueSafe = (chunk: Uint8Array) => {
              if (clientGone) return;
              try {
                controller.enqueue(chunk);
              } catch {
                // Controller was closed under us (client disconnect) — stop
                // trying to write. Mark clientGone so the loop exits.
                clientGone = true;
              }
            };
            try {
              // Each yielded StreamEvent becomes one self-delimited
              // NDJSON line. raceMerge guarantees groupStart per category
              // up front, interleaved items, and exactly one groupEnd per
              // requested category.
              for await (const evt of runPipelines({
                userPrefs,
                previousRecommendations: parsed.data.previousRecommendations,
                categories: parsed.data.categories,
              })) {
                if (clientGone) break;
                enqueueSafe(encoder.encode(JSON.stringify(evt) + "\n"));
              }
            } catch (error: any) {
              // Pipeline throws are normally converted to
              // groupEnd{generation_failed} inside backfillCategory, so we
              // rarely land here. If we do (and the client is still
              // connected), emit terminal groupEnds for both categories so
              // the client's reader sees a clean end-of-stream instead of a
              // truncated body. If the client already left, there's no one
              // to read it — just log.
              if (clientGone) {
                console.info(
                  "[stream] pipeline error after client disconnect, not emitting terminal groupEnds:",
                  error
                );
                return;
              }
              console.error("[stream] pipeline fatal:", error);
              // Emit terminal groupEnds only for requested categories so a
              // category-scoped request doesn't emit spurious events for the
              // unrequested side.
              for (const category of requestedCategories) {
                enqueueSafe(
                  encoder.encode(
                    JSON.stringify({
                      type: "groupEnd",
                      category,
                      status: "generation_failed",
                      error: "Stream failed.",
                    }) + "\n"
                  )
                );
              }
            } finally {
              request.signal.removeEventListener("abort", onAbort);
              // close() throws if already closed; guard it.
              try {
                controller.close();
              } catch {
                /* already closed */
              }
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
