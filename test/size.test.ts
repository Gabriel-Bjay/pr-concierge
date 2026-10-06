import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG } from "../src/config.js";
import { countChangedLines, sizeFor } from "../src/size.js";

const { thresholds, ignore } = DEFAULT_CONFIG.size;

describe("countChangedLines", () => {
  it("sums additions and deletions", () => {
    const files = [
      { filename: "src/a.ts", additions: 10, deletions: 2 },
      { filename: "src/b.ts", additions: 0, deletions: 5 },
    ];
    expect(countChangedLines(files, [])).toBe(17);
  });

  it("skips lockfiles and generated files at any depth", () => {
    const files = [
      { filename: "src/a.ts", additions: 10, deletions: 0 },
      { filename: "package-lock.json", additions: 4000, deletions: 900 },
      { filename: "apps/web/pnpm-lock.yaml", additions: 300, deletions: 0 },
      { filename: "composer.lock", additions: 120, deletions: 80 },
      { filename: "test/__snapshots__/a.test.ts.snap", additions: 50, deletions: 0 },
    ];
    expect(countChangedLines(files, ignore)).toBe(10);
  });
});

describe("sizeFor", () => {
  it.each([
    [0, "XS"],
    [9, "XS"],
    [10, "S"],
    [29, "S"],
    [30, "M"],
    [99, "M"],
    [100, "L"],
    [499, "L"],
    [500, "XL"],
    [25_000, "XL"],
  ])("%i changed lines is %s", (lines, size) => {
    expect(sizeFor(lines, thresholds)).toBe(size);
  });
});
