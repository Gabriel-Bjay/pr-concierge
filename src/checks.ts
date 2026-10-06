import type { ConciergeConfig } from "./config.js";
import type { Size } from "./size.js";

/** Hidden marker that identifies the bot's checklist comment so it can be updated in place. */
export const CHECKLIST_MARKER = "<!-- pr-concierge:checklist -->";

// GitHub's closing keywords: https://docs.github.com/issues/tracking-your-work-with-issues/linking-a-pull-request-to-an-issue
const CLOSING_REFERENCE =
  /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b:?\s+(?:[\w.-]+\/[\w.-]+#\d+|#\d+|https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/issues\/\d+)/i;

export interface CheckResult {
  title: string;
  passed: boolean;
  hint: string;
}

export interface ChecksInput {
  body: string | null;
  hasLinkedIssue: boolean;
  size: Size | null;
}

/** PR templates are mostly HTML comments; they shouldn't count as a description. */
export function stripHtmlComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, "");
}

export function hasClosingReference(body: string | null): boolean {
  return CLOSING_REFERENCE.test(stripHtmlComments(body ?? ""));
}

export function evaluateChecks(input: ChecksInput, config: ConciergeConfig["checks"]): CheckResult[] {
  const description = stripHtmlComments(input.body ?? "").trim();
  const results: CheckResult[] = [
    {
      title: "Has a description",
      passed: description.length >= config.minDescriptionLength,
      hint: `Explain what changed and why (at least ${config.minDescriptionLength} characters).`,
    },
  ];
  if (config.requireLinkedIssue) {
    results.push({
      title: "Links an issue",
      passed: input.hasLinkedIssue,
      hint: "Add `Fixes #123` to the description, or link an issue from the sidebar.",
    });
  }
  if (input.size) {
    results.push({
      title: "Reviewable size",
      passed: input.size !== "XL",
      hint: "This PR is XL. Consider splitting it into smaller pull requests.",
    });
  }
  return results;
}

export function renderChecklist(results: CheckResult[]): string {
  const failing = results.filter((result) => !result.passed).length;
  const heading =
    failing === 0
      ? "### ✅ PR Concierge: all checks passed"
      : `### 🛎️ PR Concierge: ${failing} ${failing === 1 ? "item needs" : "items need"} attention`;
  const items = results.map((result) =>
    result.passed ? `- [x] ${result.title}` : `- [ ] **${result.title}**: ${result.hint}`,
  );
  return [CHECKLIST_MARKER, heading, "", ...items, "", "<sub>This comment updates automatically as the PR changes.</sub>"].join(
    "\n",
  );
}
