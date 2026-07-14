# Spec 0012: Rotating stage messages

## Prerequisite
Spec 0011 deployed (`loading_preferences` stage, `StreamStage` union,
`progress` event).

## Problem
The recommendation stream emits exactly one `progress` event per stage. The
client maps that stage to a single string (`STAGE_COPY`) and shows it until
the next stage arrives. For `finding_titles` — the LLM call plus its model
fallback chain (`fetchWithModelFallback`) — that single string can sit on
screen for several seconds with no change, reading as dead air even though
work is ongoing (especially during a fallback retry).

## Goal
Let a stage show a short sequence of messages that cycle on a fixed cadence,
so a lingering stage still feels alive. **Only `finding_titles` gets multiple
messages today**; every other stage stays single-message (identical to today).

## Decisions
- **Decorative rotation, not fallback-aware.** The rotation runs on a
  client-side 2s timer and is unaware of real progress (e.g. an LLM
  fallback). Messages are generic; they never claim a retry is happening,
  because the client can't know that. Rationale + reversibility recorded in
  ADR 0001 (`docs/adr/0001-decorative-stage-rotation.md`).
- **`STAGE_MESSAGES: Record<StreamStage, string[]>`** replaces `STAGE_COPY`.
  Length-1 arrays for all stages except `finding_titles` (3 messages). Single-
  message stages render statically, identical to a plain string today.
- **`STAGE_FALLBACK_MESSAGES`** — module-level constant (`["Finding your next
  favorites"]`) for the pre-first-progress window. Identity-stable so it's a
  safe React effect dep.
- **Dumb component** — `RotatingMessage` (`src/components/recommendations/rotating-message.tsx`)
  takes `messages: string[]` + `className?`. Owns shimmer span + text + the
  2s timer. Not aware of stages, copy maps, or the stream. Caller must pass an
  identity-stable `messages` ref (module constants satisfy this).
- **Cadence: 2s, hold on last.** For 3 messages: t=0 → msg 1, t=2s → msg 2,
  t=4s → holds on msg 3 until the stage resolves. Single-message sets skip the
  timer entirely.
- **Reset on stage change** — the `messages` ref identity changes when the
  stage changes, so a `useEffect` resets the index to 0.

## Scope
- **Client-only.** No server, wire protocol, or generator changes. The
  `progress` event still carries only the `StreamStage` enum.
- `STAGE_LABELS` / `computeProgress` (the unused "found of target" path)
  untouched.
- The two `TypingDots` copies (different dot sizes) remain duplicated — out of
  scope.
- No crossfade between messages; the text swaps under the existing continuous
  shimmer.

## Behavior summary
| Stage            | Messages | Behavior                                |
| ---------------- | -------- | --------------------------------------- |
| loading_preferences | 1     | static                                   |
| finding_titles   | 3        | rotates 0s / 2s / 4s, holds on last      |
| looking_up_posters | 1     | static                                   |
| finalizing       | 1        | static                                   |
| (no stage yet)   | 1        | static fallback                          |
