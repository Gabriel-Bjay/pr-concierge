import { timingSafeEqual } from "node:crypto";
import { createServer, type Server, type ServerResponse } from "node:http";
import { createNodeMiddleware } from "@octokit/webhooks";
import type { App } from "octokit";
import { WEBHOOK_PATH } from "./github-app.js";
import { remindStaleReviews } from "./reminders.js";

export const REMIND_PATH = "/cron/remind";

export interface HttpOptions {
  /** Enables `GET /cron/remind` for schedulers such as Vercel Cron, authorized with `Bearer <cronSecret>`. */
  cronSecret?: string;
}

/** HTTP server that verifies and dispatches webhooks, plus a health check for hosting platforms. */
export function createHttpServer(app: App, { cronSecret }: HttpOptions = {}): Server {
  const handleWebhook = createNodeMiddleware(app.webhooks, { path: WEBHOOK_PATH });

  return createServer(async (request, response) => {
    if (await handleWebhook(request, response)) return;
    const { pathname } = new URL(request.url ?? "/", "http://localhost");

    if (request.method === "GET" && (pathname === "/" || pathname === "/health")) {
      sendJson(response, 200, { status: "ok" });
      return;
    }

    if (request.method === "GET" && pathname === REMIND_PATH && cronSecret) {
      if (!isAuthorized(request.headers.authorization, cronSecret)) {
        sendJson(response, 401, { error: "unauthorized" });
        return;
      }
      try {
        sendJson(response, 200, { sent: await remindStaleReviews(app) });
      } catch (error) {
        console.error(`Review reminders failed: ${String(error)}`);
        sendJson(response, 500, { error: "reminders failed" });
      }
      return;
    }

    response.writeHead(404).end();
  });
}

function isAuthorized(header: string | undefined, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(header ?? "");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

function sendJson(response: ServerResponse, status: number, body: unknown): void {
  response.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}
