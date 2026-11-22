// Unit tests for the taste-profile module (design doc item 5, adapted to
// the Mastra agent edge from #135): agent success, chain failure → null,
// schema rejection, empty input, the createdAt-desc recent-100 window,
// the 8s total-budget abort wiring, and render bounds. The agents module
// is mocked; model routing inside the agent is not under test here.
import { afterEach, describe, expect, it, vi } from "vitest";
import { generateTasteProfile, renderProfileText } from "./taste-profile";

const generate = vi.hoisted(() => vi.fn());
vi.mock("./agents", () => ({
  tasteProfileAgent: { generate },
}));

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
  generate.mockReset();
});

describe("generateTasteProfile", () => {
  it("returns the validated profile from the agent", async () => {
    generate.mockResolvedValue({ object: validProfile });

    const profile = await generateTasteProfile(content());

    expect(profile).toEqual(validProfile);
    expect(generate).toHaveBeenCalledTimes(1);
  });

  it("resolves null when the agent chain fails", async () => {
    generate.mockRejectedValue(new Error("all models down"));

    expect(await generateTasteProfile(content())).toBeNull();
  });

  it("rejects over-long output and resolves null", async () => {
    const overLong = {
      ...validProfile,
      themes: ["x".repeat(41)], // item beyond the 40-char bound
    };
    generate.mockResolvedValue({ object: overLong });

    expect(await generateTasteProfile(content())).toBeNull();
  });

  it("resolves null on empty input (nothing to distill)", async () => {
    expect(
      await generateTasteProfile(content({ movies: [], tvs: [] })),
    ).toBeNull();
    expect(generate).not.toHaveBeenCalled();
  });

  it("sends only the last 100 liked titles, newest first, to the prompt", async () => {
    generate.mockResolvedValue({ object: validProfile });
    const movies = Array.from({ length: 120 }, (_, i) => ({
      title: `Movie ${i}`,
      year: 2000 + (i % 30),
      // Ascending creation dates: Movie 119 is newest.
      createdAt: new Date(2026, 0, 1, 0, i),
      genres: ["Drama"],
    }));

    await generateTasteProfile(content({ movies, tvs: [] }));

    const prompt = generate.mock.calls[0][0] as string;
    const listed = prompt.match(/- Movie (\d+) \(/g) ?? [];
    expect(listed).toHaveLength(100);
    // Newest (Movie 119) leads; oldest sent is Movie 20.
    expect(prompt).toContain("- Movie 119 (");
    expect(prompt).not.toContain("- Movie 19 (");
  });

  it("wires the 8s total-budget abortSignal and maxRetries 0", async () => {
    generate.mockResolvedValue({ object: validProfile });

    await generateTasteProfile(content());

    const options = generate.mock.calls[0][1];
    expect(options.abortSignal).toBeInstanceOf(AbortSignal);
    expect(options.abortSignal.aborted).toBe(false);
    expect(options.modelSettings).toEqual({ maxRetries: 0 });
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
