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

**Decorative rotation**:
The client-side timer that cycles stage messages on a fixed interval. It is **not** a signal of real progress (e.g. an LLM fallback) — messages are generic and timing-based. Distinct from the LLM's own input/output, which are also called "messages" in AI-SDK vocabulary.
