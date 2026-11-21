// Unit tests for the pure title-exclusion matcher (design doc item 2:
// punctuation variants, article moves, diacritics, remakes within year ±1,
// year drift > 1, category collision, translated-title miss, prevRecs shape).
import { describe, expect, it } from "vitest";
import {
  exclusionHitFor,
  isSameTitle,
  normalizeTitle,
} from "./title-matcher";

const movie = (title: string, year: number) => ({
  category: "movie" as const,
  title,
  year,
});
const tv = (title: string, year: number) => ({
  category: "tv" as const,
  title,
  year,
});

describe("normalizeTitle", () => {
  it("lowercases and strips punctuation", () => {
    expect(normalizeTitle("Dune: Part Two")).toBe(
      normalizeTitle("Dune Part Two"),
    );
    expect(normalizeTitle("Dune: Part Two")).toBe("dune part two");
  });

  it("strips diacritics", () => {
    expect(normalizeTitle("Amélie")).toBe("amelie");
    expect(normalizeTitle("Amélie")).toBe(normalizeTitle("Amelie"));
  });

  it("drops a leading article only", () => {
    expect(normalizeTitle("The Batman")).toBe("batman");
    // Mid-title articles stay.
    expect(normalizeTitle("The Lord of the Rings")).toBe(
      "lord of the rings",
    );
  });

  it("collapses whitespace", () => {
    expect(normalizeTitle("  Dune    Part   Two ")).toBe("dune part two");
  });
});

describe("isSameTitle", () => {
  it("matches punctuation variants of the same title", () => {
    expect(isSameTitle(movie("Dune: Part Two", 2024), movie("Dune Part Two", 2024))).toBe(true);
  });

  it("matches article moves", () => {
    expect(isSameTitle(movie("The Batman", 2022), movie("Batman", 2022))).toBe(true);
  });

  it("matches diacritic variants", () => {
    expect(isSameTitle(movie("Amélie", 2001), movie("Amelie", 2001))).toBe(true);
  });

  it("matches remakes within year ±1", () => {
    expect(isSameTitle(movie("It", 2017), movie("It", 2018))).toBe(true);
  });

  it("misses on year drift > 1 (documented)", () => {
    expect(isSameTitle(movie("Dune", 2021), movie("Dune", 1984))).toBe(false);
  });

  it("misses across categories with same title and year", () => {
    expect(isSameTitle(movie("The Last of Us", 2023), tv("The Last of Us", 2023))).toBe(false);
  });

  it("misses translated titles (documented)", () => {
    expect(
      isSameTitle(movie("The Shawshank Redemption", 1994), movie("Cadena Perpetua", 1994)),
    ).toBe(false);
  });

  it("misses different titles", () => {
    expect(isSameTitle(movie("Arrival", 2016), movie("Dune", 2021))).toBe(false);
  });
});

describe("exclusionHitFor", () => {
  const pools = {
    liked: [movie("Dune", 2021)],
    disliked: [tv("Westworld", 2016)],
    prevRecs: [movie("The Batman", 2022)],
    round: [movie("Arrival", 2016)],
  };

  it("reports the first pool that contains the candidate", () => {
    // Same title, year drift within ±1.
    expect(exclusionHitFor(movie("Dune", 2022), pools)).toBe("liked");
    expect(exclusionHitFor(tv("Westworld", 2017), pools)).toBe("disliked");
    // prevRecs entries carry no TMDB id — title+year+category still match.
    expect(exclusionHitFor(movie("Batman", 2022), pools)).toBe("prevRecs");
    expect(exclusionHitFor(movie("Arrival", 2016), pools)).toBe("round");
  });

  it("returns null for unknown candidates", () => {
    expect(exclusionHitFor(movie("Inception", 2010), pools)).toBeNull();
  });
});
