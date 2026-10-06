import { describe, expect, it } from "vitest";
import { CHECKLIST_MARKER, evaluateChecks, hasClosingReference, renderChecklist } from "../src/checks.js";
import { DEFAULT_CONFIG } from "../src/config.js";

const checks = DEFAULT_CONFIG.checks;

describe("hasClosingReference", () => {
  it.each([
    "Fixes #12",
    "this closes #4",
    "Resolved: #9",
    "fix acme/widgets#31",
    "Closes https://github.com/acme/widgets/issues/7",
  ])("detects %j", (body) => {
    expect(hasClosingReference(body)).toBe(true);
  });

  it.each([
    null,
    "Related to #12",
    "prefixes #12",
    "Fixes #",
    "<!-- Fixes #123 -->\nTemplate left untouched",
  ])("ignores %j", (body) => {
    expect(hasClosingReference(body)).toBe(false);
  });
});

describe("evaluateChecks", () => {
  it("treats a PR template full of comments as an empty description", () => {
    const body = "<!-- Describe your change -->\n<!-- Link the issue -->";
    const [description] = evaluateChecks({ body, hasLinkedIssue: true, size: "S" }, checks);
    expect(description).toMatchObject({ title: "Has a description", passed: false });
  });

  it("passes a well-formed pull request", () => {
    const results = evaluateChecks(
      { body: "Adds retry with backoff to the sync worker. Fixes #42", hasLinkedIssue: true, size: "M" },
      checks,
    );
    expect(results.map((result) => [result.title, result.passed])).toEqual([
      ["Has a description", true],
      ["Links an issue", true],
      ["Reviewable size", true],
    ]);
  });

  it("flags XL pull requests and omits checks that are turned off", () => {
    const results = evaluateChecks(
      { body: "A long enough description of the change", hasLinkedIssue: false, size: "XL" },
      { ...checks, requireLinkedIssue: false },
    );
    expect(results.map((result) => [result.title, result.passed])).toEqual([
      ["Has a description", true],
      ["Reviewable size", false],
    ]);
  });
});

describe("renderChecklist", () => {
  it("starts with the hidden marker and counts failing items", () => {
    const body = renderChecklist([
      { title: "Has a description", passed: true, hint: "" },
      { title: "Links an issue", passed: false, hint: "Add `Fixes #123`." },
    ]);
    expect(body.startsWith(CHECKLIST_MARKER)).toBe(true);
    expect(body).toContain("1 item needs attention");
    expect(body).toContain("- [x] Has a description");
    expect(body).toContain("- [ ] **Links an issue**: Add `Fixes #123`.");
  });

  it("celebrates when everything passes", () => {
    expect(renderChecklist([{ title: "Has a description", passed: true, hint: "" }])).toContain("all checks passed");
  });
});
