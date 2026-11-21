// Unit tests for the taste-profile module (design doc item 5): schema
// rejection, model fallback, total failure, render bounds, and the
// createdAt-desc recent-100 window. LLM edge mocked; callWithFallback real.
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateTasteProfile, renderProfileText } from "./taste-profile";

const googleModel = vi.hoisted(() => ({ id: "google" }));
const mistralModel = vi.hoisted(() => ({ id: "mistral" }));
vi.mock("./models", () => ({ googleModel, mistralModel }));

const generateObject = vi.hoisted(() => vi.fn());
vi.mock("ai", () => ({ generateObject }));

const validProfile = {
  themes: ["cerebral sci-fi — Inception, Arrival"],
  tones: ["elegiac — Arrival"],
  plotAffinities: ["identity puzzles — Memento"],
  summary: "Prefers idea-first science fiction with emotional cores.",
};

function content(overrides?: {
  movies?: Array<{ title: string; year: number; createdAt?: Date; genres?: string[] }>;
  tvs?: Array<{ title: string; year: number; createdAt?: Date; genres?: string[] }>;
  actors?: string[];
  directors?: string[];
}) {
  return {
    movies: overrides?.movies ?? [
      { title: "Inception", year: 2010, createdAt: new Date("2026-01-01"), genres: ["Sci-Fi"] },
    ],
    tvs: overrides?.tvs ?? [
      { title: "Severance", year: 2022, createdAt: new Date("2026-01-02"), genres: ["Thriller"] },
    ],
    actors: overrides?.actors ?? [],
    directors: overrides?.directors ?? [],
  };
}

afterEach(() => {
  generateObject.mockReset();
});

describe("generateTasteProfile", () => {
  it("returns the profile on the first model", async () => {
    generateObject.mockResolvedValue({ object: validProfile });

    const profile = await generateTasteProfile(content());

    expect(profile).toEqual(validProfile);
    expect(generateObject).toHaveBeenCalledTimes(1);
    expect(generateObject.mock.calls[0][0].model).toBe(googleModel);
  });

  it("falls to model 2 when model 1 throws", async () => {
    generateObject
      .mockRejectedValueOnce(new Error("google down"))
      .mockResolvedValueOnce({ object: validProfile });

    const profile = await generateTasteProfile(content());

    expect(profile).toEqual(validProfile);
    expect(generateObject).toHaveBeenCalledTimes(2);
    expect(generateObject.mock.calls[1][0].model).toBe(mistralModel);
  });

  it("resolves null when every model fails", async () => {
    generateObject.mockRejectedValue(new Error("down"));

    expect(await generateTasteProfile(content())).toBeNull();
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("rejects over-long output and resolves null when both models misbehave", async () => {
    const overLong = {
      ...validProfile,
      themes: ["x".repeat(41)], // item beyond the 40-char bound
    };
    generateObject.mockResolvedValue({ object: overLong });

    // Both models return the over-long shape → schema rejects both → null.
    expect(await generateTasteProfile(content())).toBeNull();
    expect(generateObject).toHaveBeenCalledTimes(2);
  });

  it("resolves null on empty input (nothing to distill)", async () => {
    expect(
      await generateTasteProfile(content({ movies: [], tvs: [] })),
    ).toBeNull();
    expect(generateObject).not.toHaveBeenCalled();
  });

  it("sends only the last 100 liked titles, newest first, to the prompt", async () => {
    generateObject.mockResolvedValue({ object: validProfile });
    const movies = Array.from({ length: 120 }, (_, i) => ({
      title: `Movie ${i}`,
      year: 2000 + (i % 30),
      // Ascending creation dates: Movie 119 is newest.
      createdAt: new Date(2026, 0, 1, 0, i),
      genres: ["Drama"],
    }));

    await generateTasteProfile(content({ movies, tvs: [] }));

    const prompt = generateObject.mock.calls[0][0].prompt as string;
    const listed = prompt.match(/- Movie (\d+) \(/g) ?? [];
    expect(listed).toHaveLength(100);
    // Newest (Movie 119) leads; oldest sent is Movie 20.
    expect(prompt).toContain("- Movie 119 (");
    expect(prompt).not.toContain("- Movie 19 (");
  });
});

describe("renderProfileText", () => {
  it("joins all populated fields into one section within the total bound", () => {
    const text = renderProfileText(validProfile);

    expect(text).toContain("Themes: cerebral sci-fi — Inception, Arrival");
    expect(text).toContain("Tones: elegiac — Arrival");
    expect(text).toContain("Plot affinities: identity puzzles — Memento");
    expect(text).toContain(
      "Summary: Prefers idea-first science fiction with emotional cores.",
    );
    expect(text.length).toBeLessThanOrEqual(1200);
  });

  it("omits empty arrays and keeps the summary", () => {
    const text = renderProfileText({
      themes: [],
      tones: ["dark humor"],
      plotAffinities: [],
      summary: "Short.",
    });

    expect(text).not.toContain("Themes:");
    expect(text).not.toContain("Plot affinities:");
    expect(text).toContain("Tones: dark humor");
    expect(text).toContain("Summary: Short.");
  });
});
