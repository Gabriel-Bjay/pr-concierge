import type { App } from "octokit";
import { loadConfig } from "./config.js";

export const REMINDER_MARKER = "<!-- pr-concierge:reminder -->";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ReviewRequest {
  requested_reviewers?: { login: string }[] | null;
  requested_teams?: { slug: string }[] | null;
}

export function idleDays(updatedAt: string, now: Date): number {
  return Math.floor((now.getTime() - Date.parse(updatedAt)) / DAY_MS);
}

export function pendingReviewerMentions(pull: ReviewRequest, org: string): string[] {
  return [
    ...(pull.requested_reviewers ?? []).map((user) => `@${user.login}`),
    ...(pull.requested_teams ?? []).map((team) => `@${org}/${team.slug}`),
  ];
}

export function renderReminder(mentions: string[], days: number): string {
  return `${REMINDER_MARKER}\n👋 ${mentions.join(" ")}: this pull request has been waiting on your review for ${days} ${days === 1 ? "day" : "days"}.`;
}

/**
 * Comment on open pull requests that still have pending reviewers and no activity for
 * `staleAfterDays`. The reminder itself counts as activity, so each PR is nudged at most
 * once per stale period.
 */
export async function remindStaleReviews(app: App, now = new Date()): Promise<number> {
  let sent = 0;
  for await (const { octokit, repository } of app.eachRepository.iterator()) {
    if (repository.archived) continue;
    const owner = repository.owner.login;
    const repo = repository.name;
    try {
      const config = await loadConfig(octokit, owner, repo);
      if (!config.reminders.enabled) continue;

      const pulls = await octokit.paginate(octokit.rest.pulls.list, { owner, repo, state: "open", per_page: 100 });
      for (const pull of pulls) {
        const mentions = pendingReviewerMentions(pull, owner);
        const days = idleDays(pull.updated_at, now);
        if (pull.draft || mentions.length === 0 || days < config.reminders.staleAfterDays) continue;

        await octokit.rest.issues.createComment({ owner, repo, issue_number: pull.number, body: renderReminder(mentions, days) });
        sent++;
      }
    } catch (error) {
      console.error(`Review reminders failed for ${repository.full_name}: ${String(error)}`);
    }
  }
  return sent;
}
