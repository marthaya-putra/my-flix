# Recommendation Stream

The system that turns a user's movie/TV preferences into a live-streamed list of
personalized recommendations. A server-side generator emits NDJSON events
(stage progress, items, termination) per category; the client renders them into
carousels.

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
A generated title that passed TMDB enrichment and was not already liked/disliked by the user. Only survivors count toward the per-category target.
_Avoid_: result, valid item, keep

**Target**:
The number of survivors a category aims to produce before completing.
_Avoid_: quota, limit

**Deficit retry loop**:
When a generation round yields fewer survivors than the remaining target, the LLM is re-asked in a further round (up to a max), feeding already-seen titles back so it avoids them. Internal resilience — the user perceives one continuous process.
_Avoid_: retry, loop, re-ask

**Round**:
One pass through the deficit retry loop: ask the LLM, enrich, filter exclusions, count survivors.
_Avoid_: attempt, pass

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
