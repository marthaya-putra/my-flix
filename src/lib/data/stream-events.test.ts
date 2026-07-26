// src/lib/data/stream-events.test.ts
// ADR 0002 — the first passing example of the unit layer. `computeProgress`
// is the kind of pure-logic seam the Vitest suite exists for: no React, no
// SSR, no mocks — just input/output. Mirrors the ADR's "required seams" list.
import { describe, expect, it } from "vitest";
import {
  RETRY_MESSAGES,
  STAGE_FALLBACK_MESSAGES,
  STAGE_LABELS,
  STAGE_MESSAGES,
  computeProgress,
  stageMessagesFor,
} from "./stream-events";

describe("computeProgress", () => {
  it("returns null before the first progress event (no stage)", () => {
    expect(computeProgress({})).toBeNull();
    expect(computeProgress({ stage: undefined })).toBeNull();
  });

  it("returns a label-only result for countless stages (no target/found)", () => {
    const result = computeProgress({ stage: "loading_preferences" });
    expect(result).toEqual({
      label: STAGE_LABELS.loading_preferences,
      found: 0,
      target: 0,
      pct: 0,
    });
  });

  it("returns null when a counted stage is missing target or found", () => {
    expect(
      computeProgress({ stage: "finding_titles", found: 3 }),
    ).toBeNull();
    expect(
      computeProgress({ stage: "finding_titles", target: 10 }),
    ).toBeNull();
  });

  it("formats label as 'STAGE · found of target' and clamps found to target", () => {
    const result = computeProgress({
      stage: "finding_titles",
      found: 3,
      target: 10,
    });
    expect(result).toEqual({
      label: `${STAGE_LABELS.finding_titles} · 3 of 10`,
      found: 3,
      target: 10,
      pct: 30,
    });
  });

  it("clamps found above target so pct never exceeds 100", () => {
    const result = computeProgress({
      stage: "looking_up_posters",
      found: 12,
      target: 10,
    });
    expect(result?.found).toBe(10);
    expect(result?.pct).toBe(100);
  });
});

describe("stageMessagesFor", () => {
  it("returns the retry set when retry is true, regardless of stage", () => {
    expect(stageMessagesFor("finding_titles", true)).toBe(RETRY_MESSAGES);
    // retry wins even before a stage exists
    expect(stageMessagesFor(undefined, true)).toBe(RETRY_MESSAGES);
  });

  it("falls back to the pre-event set when stage is missing and not retrying", () => {
    expect(stageMessagesFor(undefined)).toBe(STAGE_FALLBACK_MESSAGES);
  });

  it("returns the per-stage message array otherwise", () => {
    expect(stageMessagesFor("finalizing")).toBe(STAGE_MESSAGES.finalizing);
  });
});
