#!/usr/bin/env node
// Offline title verification (design doc item 16). Parses RECO_DEBUG_LOG
// JSON lines from a server log file and reports, per title, whether the
// pipeline's own poster lookup found it — plus the aggregate fake-title
// rate (misses / total). It does NOT re-query TMDB: its oracle is exactly
// the lookup the pipeline already ran.
//
// Usage: node scripts/verify-titles.mjs <logfile> [logfile...]
// Produce the lines by running the app with RECO_DEBUG_LOG=1.
import { readFileSync } from "node:fs";

const DEBUG_PREFIX = "RECO_DEBUG_LOG ";

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error("Usage: node scripts/verify-titles.mjs <logfile> [logfile...]");
  process.exit(1);
}

let runs = 0;
let hits = 0;
let misses = 0;

for (const file of files) {
  const lines = readFileSync(file, "utf8").split("\n");
  for (const line of lines) {
    const at = line.indexOf(DEBUG_PREFIX);
    if (at === -1) continue;
    let entry;
    try {
      entry = JSON.parse(line.slice(at + DEBUG_PREFIX.length));
    } catch {
      console.warn(`Skipping malformed line: ${line.slice(0, 120)}`);
      continue;
    }
    if (!Array.isArray(entry.patchOutcomes)) continue;

    runs++;
    const head = `run ${entry.runId ?? "?"} [${entry.category ?? "?"}]` +
      (entry.matcherExcluded
        ? ` matcherExcluded=${JSON.stringify(entry.matcherExcluded)}`
        : "");
    console.log(head);
    for (const outcome of entry.patchOutcomes) {
      if (outcome.found) hits++;
      else misses++;
      console.log(
        `  ${outcome.found ? "HIT " : "MISS"}  ${outcome.title} (${outcome.year})`,
      );
    }
  }
}

const total = hits + misses;
console.log("");
if (total === 0) {
  console.log("No RECO_DEBUG_LOG entries found — run the app with RECO_DEBUG_LOG=1 first.");
} else {
  const rate = ((misses / total) * 100).toFixed(1);
  console.log(
    `Runs: ${runs}  Titles: ${total}  Hits: ${hits}  Misses: ${misses}`,
  );
  console.log(`Fake-title rate (patch misses): ${rate}%`);
}
