import { readFileSync } from "node:fs";
import { App, Octokit } from "octokit";
import { reviewPullRequest } from "./review.js";

export const WEBHOOK_PATH = "/api/github/webhooks";

function requireEnv(env: NodeJS.ProcessEnv, name: string): string {
  const value = env[name];
  if (!value) throw new Error(`Missing ${name}. Run \`npm run setup\` or copy .env.example to .env.`);
  return value;
}

/** Build the GitHub App from environment variables and register its webhook handlers. */
export function createApp(env: NodeJS.ProcessEnv = process.env, octokit: typeof Octokit = Octokit): App {
  const privateKey = env.PRIVATE_KEY
    ? env.PRIVATE_KEY.replace(/\\n/g, "\n")
    : readFileSync(requireEnv(env, "PRIVATE_KEY_PATH"), "utf8");

  const app = new App({
    appId: requireEnv(env, "APP_ID"),
    privateKey,
    webhooks: { secret: requireEnv(env, "WEBHOOK_SECRET") },
    // GITHUB_API_URL points the app at GitHub Enterprise Server, e.g. https://ghe.example.com/api/v3
    Octokit: env.GITHUB_API_URL ? octokit.defaults({ baseUrl: env.GITHUB_API_URL }) : octokit,
  });

  app.webhooks.on(
    [
      "pull_request.opened",
      "pull_request.reopened",
      "pull_request.synchronize",
      "pull_request.edited",
      "pull_request.ready_for_review",
    ],
    async ({ octokit, payload }) => {
      if (payload.pull_request.state !== "open") return;
      await reviewPullRequest(octokit, {
        owner: payload.repository.owner.login,
        repo: payload.repository.name,
        pull: payload.pull_request,
      });
    },
  );

  // Failed deliveries (bad signatures, handler errors) are logged by the webhook middleware.
  return app;
}
