# Decorative, client-timed stage-message rotation (not server fallback events)

When the `finding_titles` stage lingers — the LLM call plus its model-fallback
chain can take several seconds — a single static message reads as dead air. We
chose to rotate through generic messages on a **client-side 2s timer**, keeping
the wire protocol unchanged (the `progress` event still carries only the
`StreamStage` enum), rather than have the server emit a real event when
`fetchWithModelFallback` retries.

We explicitly accept that rotation is **decorative, not factual**: a message
like "Still narrowing things down…" may show when no fallback occurred. The
alternative — a fallback-aware event so copy could say "first model was busy,
trying a stronger one" — was rejected to avoid new wire fields and generator
changes. If honest fallback messaging becomes worth it later, add the event
then; the rotating component is message-source-agnostic and won't need rework.
