# Recommendation Stream

The system that turns a user's movie/TV preferences into a live-streamed list of
personalized recommendations. A server-side generator emits NDJSON events
(stage progress, items, poster patches, termination) per category; the client
renders them into carousels. Cards render title-first from the LLM's own
output; posters arrive later as background patches.

## Language

**Stage**:
A named phase of the recommendation pipeline the server reports over the wire via the `StreamStage` enum (`loading_preferences`, `finding_titles`, `looking_up_posters`, `finalizing`). A stage is a *signal of where work is*, not a count.
_Avoid_: step, status, phase (the enum value is "stage")

**Stage message**:
A human-facing string shown while a stage is active. Each stage maps to an **array** of one or more messages (`STAGE_MESSAGES`); the client rotates through them at a fixed cadence. Stages with a single message render statically.
_Avoid_: copy, label, text

**Progress event**:
The wire variant `{ type: "progress"; stage; found }`. Carries the current stage (and a survivor count the UI currently ignores). Drives stage-message display.
_Avoid_: status event, tick

**Category**:
A recommendation domain: `movie` or `tv`. Recommendations stream in parallel, one stream per category.
_Avoid_: type, medium, kind

**Survivor**:
A generated title that passed the exclusion matcher and was capped into the per-category target. Only survivors are emitted as items.
_Avoid_: result, valid item, keep

**Target**:
The number of survivors a category aims to produce before completing.
_Avoid_: quota, limit

**Overask**:
The single LLM round asks for 2 × target candidates per category; surplus absorbs matcher exclusions and lookup misses. Replaces the old deficit retry loop — there are no retry rounds.
_Avoid_: retry, buffer, surplus

**Poster lookup**:
The best-effort TMDB search (title + year with fallback, 10s timeout each) that runs in the background after items are emitted. Replaces the old blocking enrichment gate: a miss no longer rejects a candidate, it only leaves the card posterless.
_Avoid_: enrichment, TMDB gate

**Poster patch**:
The wire variant `{ type: "itemPatch"; category; title; releasedYear; filmInfo }`. Keyed by the item's LLM title/year; emitted once per item, in item order, after all of a category's lookups settle. `filmInfo: null` means the lookup failed or timed out.
_Avoid_: update, refresh

**Exclusion matcher**:
Duplicate protection by normalized title + year (±1) + category against liked, disliked, previously recommended, and already-emitted titles — not by TMDB id.
_Avoid_: exclude set, ID filter

**Taste profile**:
A per-run LLM distillation of the user's last ≤100 liked titles and favorite people (themes, tones, plot affinities, summary) injected into the recommendation prompt. Never stored; any failure leaves the prompt exactly as without it.
_Avoid_: stored profile, weights

**Stream run**:
One `groupStart` → `groupEnd` lifecycle for a single category; the unit over which stage progress is tracked. A fresh user-triggered load (initial load, load-more) begins a new run.
_Avoid_: session, connection, stream

**Decorative rotation**:
The client-side timer that cycles stage messages on a fixed interval. It is **not** a signal of real progress (e.g. an LLM fallback) — messages are generic and timing-based. Distinct from the LLM's own input/output, which are also called "messages" in AI-SDK vocabulary.

# Watchlist

A user's list of movies and TV series saved to watch later.

## Language

**Watchlist**:
A user's list of movies and TV series saved to watch later. Orthogonal to Likes: a title can be liked, watchlisted, both, or neither, and toggling one never touches the other. Not consumed by the recommendation loop.
_Avoid_: watch list, watch later, saved, my list, favorites, bookmark (as a feature name — the icon is a bookmark, the feature is Watchlist)

**Likes**:
The existing taste signal that feeds the recommendation loop (movies/TV the user enjoyed). Distinct from Watchlist, which is intent ("want to watch") not taste ("enjoyed"). A title can be both liked and watchlisted.
_Avoid_: favorites, preferences (preferences is the table name, not the user-facing concept)
