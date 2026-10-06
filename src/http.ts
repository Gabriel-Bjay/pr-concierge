import { createServer, type Server } from "node:http";
import { createNodeMiddleware } from "@octokit/webhooks";
import type { App } from "octokit";
import { WEBHOOK_PATH } from "./app.js";

/** HTTP server that verifies and dispatches webhooks, plus a health check for hosting platforms. */
export function createHttpServer(app: App): Server {
  const handleWebhook = createNodeMiddleware(app.webhooks, { path: WEBHOOK_PATH });

  return createServer(async (request, response) => {
    if (await handleWebhook(request, response)) return;

    if (request.method === "GET" && (request.url === "/" || request.url === "/health")) {
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ status: "ok" }));
      return;
    }
    response.writeHead(404).end();
  });
}
