import { describe, expect, it } from "vitest";
import { parse } from "yaml";
import { DEFAULT_CONFIG, mergeConfig } from "../src/config.js";

describe("mergeConfig", () => {
  it("returns defaults for an empty or missing file", () => {
    expect(mergeConfig(undefined)).toEqual(DEFAULT_CONFIG);
    expect(mergeConfig(parse(""))).toEqual(DEFAULT_CONFIG);
  });

  it("overrides only the keys the repository sets", () => {
    const config = mergeConfig(
      parse(`
size:
  thresholds:
    l: 800
  ignore: ["dist/**"]
reminders:
  staleAfterDays: 5
`),
    );
    expect(config.size.thresholds).toEqual({ ...DEFAULT_CONFIG.size.thresholds, l: 800 });
    expect(config.size.ignore).toEqual(["dist/**"]);
    expect(config.reminders).toEqual({ enabled: true, staleAfterDays: 5 });
    expect(config.checks).toEqual(DEFAULT_CONFIG.checks);
  });

  it("ignores values of the wrong type and unknown keys", () => {
    const config = mergeConfig({ checks: { enabled: "no", minDescriptionLength: 50, surprise: true }, size: { ignore: [1, 2] } });
    expect(config.checks).toEqual({ ...DEFAULT_CONFIG.checks, minDescriptionLength: 50 });
    expect(config.size.ignore).toEqual(DEFAULT_CONFIG.size.ignore);
  });

  it("falls back to default thresholds when they are not ascending", () => {
    const config = mergeConfig({ size: { thresholds: { xs: 50, s: 10 } } });
    expect(config.size.thresholds).toEqual(DEFAULT_CONFIG.size.thresholds);
  });
});
