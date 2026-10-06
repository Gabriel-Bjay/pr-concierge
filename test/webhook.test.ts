// End-to-end: signed webhook -> HTTP server -> real Octokit -> stand-in GitHub API.
import { createHmac, generateKeyPairSync, randomUUID } from "node:crypto";
import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { Octokit } from "octokit";
import { afterEach, describe, expect, it } from "vitest";
import { createApp, WEBHOOK_PATH } from "../src/github-app.js";
import { CHECKLIST_MARKER } from "../src/checks.js";
import { createHttpServer, REMIND_PATH, type HttpOptions } from "../src/http.js";

const SECRET = "webhook-secret";
const { privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});

interface Call {
  method: string;
  path: string;
  body: any;
}
type Routes = Record<string, [status: number, body?: unknown]>;

const REPO = "/repos/acme/widgets";
const BASE_ROUTES: Routes = {
  "POST /app/installations/1/access_tokens": [
    201,
    { token: "ghs_test", expires_at: "2099-01-01T00:00:00Z", permissions: {}, repository_selection: "all" },
  ],
  [`GET ${REPO}/contents/.github/pr-concierge.yml`]: [404, { message: "Not Found" }],
  [`GET ${REPO}/issues/7/comments`]: [200, []],
  [`POST ${REPO}/issues/7/comments`]: [201, { id: 1 }],
  [`POST ${REPO}/labels`]: [201, {}],
  [`POST ${REPO}/issues/7/labels`]: [200, []],
  [`DELETE ${REPO}/issues/7/labels/size/XS`]: [200, []],
  "POST /graphql": [200, { data: { repository: { pullRequest: { closingIssuesReferences: { totalCount: 0 } } } } }],
};

/** Stand-in for api.github.com that records every request Octokit makes. */
function fakeGitHub(routes: Routes) {
  const calls: Call[] = [];
  const fetch = async (input: string | URL | Request, init?: RequestInit): Promise<Response> => {
    const url = new URL(input instanceof Request ? input.url : input);
    const call = {
      method: (init?.method ?? "GET").toUpperCase(),
      path: decodeURIComponent(url.pathname),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    };
    calls.push(call);
    const [status, body] = routes[`${call.method} ${call.path}`] ?? [500, { message: `Unexpected ${call.method} ${call.path}` }];
    return new Response(body === undefined ? null : JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  };
  // Throttling spaces writes ~1s apart in production; tests don't need to wait.
  return { calls, Octokit: Octokit.defaults({ request: { fetch }, throttle: { enabled: false } }) };
}

function pullRequestEvent(pull: object) {
  return {
    action: "opened",
    installation: { id: 1 },
    repository: { name: "widgets", owner: { login: "acme" } },
    pull_request: {
      number: 7,
      state: "open",
      body: "wip",
      additions: 1050,
      deletions: 10,
      changed_files: 2,
      labels: [],
      user: { login: "ada", type: "User" },
      ...pull,
    },
  };
}

let server: Server | undefined;
afterEach(() => server?.close());

async function startServer(routes: Routes, options: HttpOptions = {}) {
  const github = fakeGitHub({ ...BASE_ROUTES, ...routes });
  const app = createApp({ APP_ID: "1", PRIVATE_KEY: privateKey, WEBHOOK_SECRET: SECRET }, github.Octokit);
  server = createHttpServer(app, options);
  await new Promise<void>((resolve) => server!.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  return { url: `http://127.0.0.1:${port}`, calls: github.calls };
}

async function deliver(routes: Routes, payload: object, secret = SECRET) {
  const { url, calls } = await startServer(routes);
  const body = JSON.stringify(payload);
  const response = await fetch(`${url}${WEBHOOK_PATH}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-github-event": "pull_request",
      "x-github-delivery": randomUUID(),
      "x-hub-signature-256": `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`,
    },
    body,
  });
  return { status: response.status, calls };
}

const routeOf = (call: Call) => `${call.method} ${call.path}`;

describe("pull_request webhooks", () => {
  it("labels a new PR by size and posts a checklist of what's missing", async () => {
    const { status, calls } = await deliver(
      {
        [`GET ${REPO}/pulls/7/files`]: [
          200,
          [
            { filename: "src/sync.ts", additions: 40, deletions: 10 },
            { filename: "package-lock.json", additions: 1010, deletions: 0 },
          ],
        ],
      },
      pullRequestEvent({ labels: [{ name: "size/XS" }, { name: "bug" }] }),
    );

    expect(status).toBe(200);
    expect(calls.map(routeOf)).toEqual([
      "POST /app/installations/1/access_tokens",
      `GET ${REPO}/contents/.github/pr-concierge.yml`,
      `GET ${REPO}/pulls/7/files`,
      `DELETE ${REPO}/issues/7/labels/size/XS`,
      `POST ${REPO}/labels`,
      `POST ${REPO}/issues/7/labels`,
      "POST /graphql",
      `GET ${REPO}/issues/7/comments`,
      `POST ${REPO}/issues/7/comments`,
    ]);

    const find = (route: string) => calls.find((call) => routeOf(call) === route)!;
    // 50 lines once the lockfile is ignored -> M, not XL.
    expect(find(`POST ${REPO}/labels`).body).toMatchObject({ name: "size/M", color: "7f7203" });
    expect(find(`POST ${REPO}/issues/7/labels`).body).toEqual({ labels: ["size/M"] });
    expect(find("POST /graphql").body.variables).toEqual({ owner: "acme", repo: "widgets", number: 7 });

    const comment: string = find(`POST ${REPO}/issues/7/comments`).body.body;
    expect(comment.startsWith(CHECKLIST_MARKER)).toBe(true);
    expect(comment).toContain("2 items need attention");
    expect(comment).toContain("- [ ] **Has a description**");
    expect(comment).toContain("- [ ] **Links an issue**");
    expect(comment).toContain("- [x] Reviewable size");
  });

  it("updates its existing checklist once the PR is fixed, without extra API calls", async () => {
    const { status, calls } = await deliver(
      {
        [`GET ${REPO}/pulls/7/files`]: [200, [{ filename: "src/sync.ts", additions: 15, deletions: 5 }]],
        [`GET ${REPO}/issues/7/comments`]: [
          200,
          [
            { id: 98, body: "Looks good to me", user: { type: "User" } },
            { id: 99, body: `${CHECKLIST_MARKER}\nold checklist`, user: { type: "Bot" } },
          ],
        ],
        [`PATCH ${REPO}/issues/comments/99`]: [200, {}],
      },
      pullRequestEvent({
        body: "Adds retry with backoff to the sync worker. Fixes #42",
        labels: [{ name: "size/S" }],
      }),
    );

    expect(status).toBe(200);
    expect(calls.map(routeOf)).toEqual([
      "POST /app/installations/1/access_tokens",
      `GET ${REPO}/contents/.github/pr-concierge.yml`,
      `GET ${REPO}/pulls/7/files`,
      `GET ${REPO}/issues/7/comments`,
      `PATCH ${REPO}/issues/comments/99`,
    ]);
    expect(calls.at(-1)!.body.body).toContain("all checks passed");
  });

  it("rejects deliveries with a bad signature before touching GitHub", async () => {
    const { status, calls } = await deliver({}, pullRequestEvent({}), "not-the-secret");
    expect(status).toBe(400);
    expect(calls).toEqual([]);
  });
});

describe("pages", () => {
  it("serves the product page at / and a JSON health check at /health", async () => {
    const { url, calls } = await startServer({});

    const page = await fetch(url);
    expect(page.status).toBe(200);
    expect(page.headers.get("content-type")).toBe("text/html; charset=utf-8");
    const html = await page.text();
    expect(html).toContain("<title>PR Concierge</title>");
    expect(html).toContain('href="mailto:');

    const health = await fetch(`${url}/health`);
    expect(await health.json()).toEqual({ status: "ok" });
    expect((await fetch(`${url}/nope`)).status).toBe(404);
    expect(calls).toEqual([]);
  });
});

describe("cron endpoint", () => {
  it("does not exist unless a cron secret is configured", async () => {
    const { url } = await startServer({});
    expect((await fetch(`${url}${REMIND_PATH}`)).status).toBe(404);
  });

  it("rejects requests without the cron secret", async () => {
    const { url, calls } = await startServer({}, { cronSecret: "cron-secret" });
    expect((await fetch(`${url}${REMIND_PATH}`)).status).toBe(401);
    const wrong = await fetch(`${url}${REMIND_PATH}`, { headers: { authorization: "Bearer guess" } });
    expect(wrong.status).toBe(401);
    expect(calls).toEqual([]);
  });

  it("runs reminders across installations when authorized", async () => {
    const { url, calls } = await startServer({ "GET /app/installations": [200, []] }, { cronSecret: "cron-secret" });
    const response = await fetch(`${url}${REMIND_PATH}`, { headers: { authorization: "Bearer cron-secret" } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: 0 });
    expect(calls.map(routeOf)).toEqual(["GET /app/installations"]);
  });
});
