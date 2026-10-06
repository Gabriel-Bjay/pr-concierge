// Registers PR Concierge as a GitHub App on your account using the manifest flow:
// https://docs.github.com/apps/sharing-github-apps/registering-a-github-app-from-a-manifest
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createServer, type ServerResponse } from "node:http";
import { parseEnv } from "node:util";
import { Octokit } from "octokit";
import { SmeeClient } from "smee-client";

const ENV_FILE = ".env";
const KEY_FILE = "private-key.pem";
const port = Number(process.env.PORT ?? 3000);
const origin = `http://localhost:${port}`;

const env = Object.fromEntries(
  Object.entries(existsSync(ENV_FILE) ? parseEnv(readFileSync(ENV_FILE, "utf8")) : {}).filter(
    (entry): entry is [string, string] => entry[1] !== undefined,
  ),
);

if (env.APP_ID) {
  console.log(`An app is already registered (APP_ID=${env.APP_ID}). Remove APP_ID from ${ENV_FILE} to register a new one.`);
  process.exit(0);
}

const state = randomBytes(16).toString("hex");
const webhookUrl = env.WEBHOOK_PROXY_URL ?? (await SmeeClient.createChannel());
const org = process.env.GITHUB_ORG;
const registerUrl = org
  ? `https://github.com/organizations/${encodeURIComponent(org)}/settings/apps/new`
  : "https://github.com/settings/apps/new";

const manifest = {
  name: `PR Concierge ${randomBytes(2).toString("hex")}`,
  url: process.env.APP_HOMEPAGE ?? "https://github.com",
  description: "Labels pull requests by size, checks PR hygiene, and nudges reviewers on stale reviews.",
  hook_attributes: { url: webhookUrl },
  redirect_url: `${origin}/callback`,
  public: false,
  default_permissions: { contents: "read", issues: "write", metadata: "read", pull_requests: "write" },
  default_events: ["pull_request"],
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", origin);

  if (url.pathname === "/") {
    send(
      response,
      200,
      "Register PR Concierge",
      `<p>This creates a private GitHub App on ${org ? `the <b>${escapeHtml(org)}</b> organization` : "your account"} with these permissions:</p>
      <ul>
        <li>Pull requests: read &amp; write</li>
        <li>Issues: read &amp; write</li>
        <li>Contents: read-only (for <code>.github/pr-concierge.yml</code>)</li>
        <li>Metadata: read-only</li>
      </ul>
      <p>Webhooks go to <code>${escapeHtml(webhookUrl)}</code>, which <code>npm run dev</code> relays to this machine.</p>
      <form action="${registerUrl}?state=${state}" method="post">
        <input type="hidden" name="manifest" value="${escapeHtml(JSON.stringify(manifest))}">
        <button type="submit">Register GitHub App</button>
      </form>
      <p class="muted">You can rename the app on the next screen.</p>`,
    );
    return;
  }

  if (url.pathname === "/callback") {
    const code = url.searchParams.get("code");
    if (!code || url.searchParams.get("state") !== state) {
      send(response, 400, "Registration link expired", "<p>Restart <code>npm run setup</code> and try again.</p>");
      return;
    }
    try {
      const { data } = await new Octokit().rest.apps.createFromManifest({ code });
      writeFileSync(KEY_FILE, data.pem);
      writeEnv({
        ...env,
        APP_ID: String(data.id),
        PRIVATE_KEY_PATH: `./${KEY_FILE}`,
        WEBHOOK_SECRET: data.webhook_secret ?? "",
        WEBHOOK_PROXY_URL: webhookUrl,
      });
      send(
        response,
        200,
        `Registered ${escapeHtml(data.name)}`,
        `<p>Credentials were saved to <code>${ENV_FILE}</code> and <code>${KEY_FILE}</code>. Keep both out of git.</p>
        <p><a class="button" href="${escapeHtml(data.html_url)}/installations/new">Install it on a repository</a></p>
        <p>Then run <code>npm run dev</code> and open a pull request in that repository.</p>`,
      );
      console.log(`Registered ${data.name} (APP_ID=${data.id}). Install it: ${data.html_url}/installations/new`);
      setTimeout(() => process.exit(0), 500);
    } catch (error) {
      send(response, 500, "Registration failed", `<pre>${escapeHtml(String(error))}</pre>`);
    }
    return;
  }

  send(response, 404, "Not found", "");
});

server.listen(port, () => console.log(`Open ${origin} in your browser to register your GitHub App.`));

function writeEnv(values: Record<string, string>): void {
  const lines = Object.entries(values).map(([key, value]) => `${key}=${value}`);
  writeFileSync(ENV_FILE, `${lines.join("\n")}\n`);
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => `&#${char.charCodeAt(0)};`);
}

function send(response: ServerResponse, status: number, title: string, body: string): void {
  response.writeHead(status, { "content-type": "text/html; charset=utf-8" }).end(`<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <style>
    :root { color-scheme: light dark; }
    body { font: 16px/1.6 system-ui, sans-serif; max-width: 40rem; margin: 4rem auto; padding: 0 1rem; }
    button, .button { font: inherit; background: #1f883d; color: #fff; border: 0; border-radius: 6px;
      padding: .6rem 1.1rem; cursor: pointer; text-decoration: none; display: inline-block; }
    code { font-size: .9em; padding: .1rem .3rem; border-radius: 4px; background: rgb(127 127 127 / .15); }
    .muted { opacity: .7; font-size: .9em; }
  </style>
</head>
<body><h1>${title}</h1>${body}</body>
</html>`);
}
