import { RequestError } from "octokit";
import { CHECKLIST_MARKER, evaluateChecks, hasClosingReference, renderChecklist, type CheckResult } from "./checks.js";
import { loadConfig, type ConciergeConfig, type GitHub } from "./config.js";
import { countChangedLines, SIZE_LABELS, sizeFor, sizeLabel, sizeLabelColor, type Size } from "./size.js";

/** The fields of a webhook `pull_request` payload that PR Concierge relies on. */
export interface PullRequest {
  number: number;
  body: string | null;
  additions?: number;
  deletions?: number;
  changed_files?: number;
  labels: { name: string }[];
  user: { type?: string } | null;
}

export interface PullRequestTarget {
  owner: string;
  repo: string;
  pull: PullRequest;
}

// The "list pull request files" endpoint returns at most 3,000 files.
const MAX_LISTED_FILES = 3000;

const CLOSING_ISSUES_QUERY = /* GraphQL */ `
  query ($owner: String!, $repo: String!, $number: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $number) {
        closingIssuesReferences(first: 1) {
          totalCount
        }
      }
    }
  }
`;

interface ClosingIssuesResult {
  repository: { pullRequest: { closingIssuesReferences: { totalCount: number } } | null } | null;
}

/** Label the pull request by size and keep its checklist comment up to date. */
export async function reviewPullRequest(octokit: GitHub, target: PullRequestTarget): Promise<void> {
  const config = await loadConfig(octokit, target.owner, target.repo);

  const size = config.size.enabled ? await measure(octokit, target, config.size) : null;
  if (size) await applySizeLabel(octokit, target, size);

  const isBot = target.pull.user?.type === "Bot";
  if (config.checks.enabled && !(config.checks.skipBots && isBot)) {
    const hasLinkedIssue =
      config.checks.requireLinkedIssue &&
      (hasClosingReference(target.pull.body) || (await countClosingIssues(octokit, target)) > 0);
    const results = evaluateChecks({ body: target.pull.body, hasLinkedIssue, size }, config.checks);
    await upsertChecklist(octokit, target, results);
  }
}

async function measure(octokit: GitHub, { owner, repo, pull }: PullRequestTarget, config: ConciergeConfig["size"]): Promise<Size> {
  const totals = pull.additions !== undefined && pull.deletions !== undefined ? pull.additions + pull.deletions : undefined;
  const tooManyFiles = (pull.changed_files ?? 0) > MAX_LISTED_FILES;
  if (totals !== undefined && (config.ignore.length === 0 || tooManyFiles)) {
    return sizeFor(totals, config.thresholds);
  }

  const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: pull.number,
    per_page: 100,
  });
  return sizeFor(countChangedLines(files, config.ignore), config.thresholds);
}

async function applySizeLabel(octokit: GitHub, { owner, repo, pull }: PullRequestTarget, size: Size): Promise<void> {
  const wanted = sizeLabel(size);
  const current = pull.labels.map((label) => label.name);

  for (const name of current) {
    if (name !== wanted && SIZE_LABELS.includes(name)) {
      await octokit.rest.issues.removeLabel({ owner, repo, issue_number: pull.number, name }).catch(ignoreStatus(404));
    }
  }
  if (current.includes(wanted)) return;

  // 422 means the label already exists in the repository.
  await octokit.rest.issues
    .createLabel({ owner, repo, name: wanted, color: sizeLabelColor(size), description: "Pull request size, set by PR Concierge" })
    .catch(ignoreStatus(422));
  await octokit.rest.issues.addLabels({ owner, repo, issue_number: pull.number, labels: [wanted] });
}

/** Counts issues linked from the sidebar as well as those referenced with closing keywords. */
async function countClosingIssues(octokit: GitHub, { owner, repo, pull }: PullRequestTarget): Promise<number> {
  const result = await octokit.graphql<ClosingIssuesResult>(CLOSING_ISSUES_QUERY, { owner, repo, number: pull.number });
  return result.repository?.pullRequest?.closingIssuesReferences.totalCount ?? 0;
}

async function upsertChecklist(octokit: GitHub, { owner, repo, pull }: PullRequestTarget, results: CheckResult[]): Promise<void> {
  const body = renderChecklist(results);
  const comments = await octokit.paginate(octokit.rest.issues.listComments, {
    owner,
    repo,
    issue_number: pull.number,
    per_page: 100,
  });
  const existing = comments.find((comment) => comment.user?.type === "Bot" && comment.body?.includes(CHECKLIST_MARKER));

  if (existing) {
    if (existing.body !== body) await octokit.rest.issues.updateComment({ owner, repo, comment_id: existing.id, body });
  } else if (results.some((result) => !result.passed)) {
    // Stay quiet on pull requests that are already in good shape.
    await octokit.rest.issues.createComment({ owner, repo, issue_number: pull.number, body });
  }
}

function ignoreStatus(status: number) {
  return (error: unknown): void => {
    if (!(error instanceof RequestError && error.status === status)) throw error;
  };
}
