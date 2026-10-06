import { RequestError, type App } from "octokit";
import { describe, expect, it, vi } from "vitest";
import { idleDays, pendingReviewerMentions, REMINDER_MARKER, remindStaleReviews, renderReminder } from "../src/reminders.js";

const now = new Date("2026-10-05T12:00:00Z");

describe("reminder helpers", () => {
  it("counts whole idle days", () => {
    expect(idleDays("2026-10-02T13:00:00Z", now)).toBe(2);
    expect(idleDays("2026-10-02T11:00:00Z", now)).toBe(3);
  });

  it("mentions pending users and teams", () => {
    const mentions = pendingReviewerMentions({ requested_reviewers: [{ login: "ada" }], requested_teams: [{ slug: "backend" }] }, "acme");
    expect(mentions).toEqual(["@ada", "@acme/backend"]);
    expect(renderReminder(mentions, 1)).toBe(`${REMINDER_MARKER}\n👋 @ada @acme/backend: this pull request has been waiting on your review for 1 day.`);
  });
});

describe("remindStaleReviews", () => {
  it("nudges only open, non-draft PRs with pending reviewers that have gone stale", async () => {
    const pull = (number: number, updated_at: string, extra: object = {}) => ({
      number,
      updated_at,
      draft: false,
      requested_reviewers: [{ login: "ada" }],
      requested_teams: [],
      ...extra,
    });
    const createComment = vi.fn().mockResolvedValue({});
    const octokit = {
      rest: {
        repos: {
          getContent: vi.fn().mockRejectedValue(
            new RequestError("Not Found", 404, { request: { method: "GET", url: "", headers: {} } }),
          ),
        },
        pulls: { list: vi.fn() },
        issues: { createComment },
      },
      paginate: vi.fn().mockResolvedValue([
        pull(1, "2026-09-28T12:00:00Z"), // stale: remind
        pull(2, "2026-10-04T12:00:00Z"), // recent activity
        pull(3, "2026-09-20T12:00:00Z", { draft: true }), // draft
        pull(4, "2026-09-20T12:00:00Z", { requested_reviewers: [] }), // nobody pending
      ]),
    };
    const app = {
      eachRepository: {
        async *iterator() {
          yield { octokit, repository: { archived: false, name: "widgets", full_name: "acme/widgets", owner: { login: "acme" } } };
          yield { octokit, repository: { archived: true, name: "old", full_name: "acme/old", owner: { login: "acme" } } };
        },
      },
    } as unknown as App;

    expect(await remindStaleReviews(app, now)).toBe(1);
    expect(createComment).toHaveBeenCalledOnce();
    expect(createComment).toHaveBeenCalledWith({
      owner: "acme",
      repo: "widgets",
      issue_number: 1,
      body: renderReminder(["@ada"], 7),
    });
  });
});
