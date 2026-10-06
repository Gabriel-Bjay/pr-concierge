import { existsSync } from "node:fs";
import { createApp, WEBHOOK_PATH } from "./app.js";
import { createHttpServer } from "./http.js";
import { remindStaleReviews } from "./reminders.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

createHttpServer(app).listen(port, () => {
  console.log(`PR Concierge is listening for webhooks on http://localhost:${port}${WEBHOOK_PATH}`);
});

// In development, relay webhooks from the smee.io channel created by `npm run setup`.
if (process.env.WEBHOOK_PROXY_URL) {
  const { SmeeClient } = await import("smee-client");
  await new SmeeClient({
    source: process.env.WEBHOOK_PROXY_URL,
    target: `http://localhost:${port}${WEBHOOK_PATH}`,
    logger: console,
  }).start();
}

const reminderHours = Number(process.env.REMINDER_INTERVAL_HOURS ?? 0);
if (reminderHours > 0) {
  setInterval(() => {
    remindStaleReviews(app)
      .then((sent) => console.log(`Sent ${sent} review reminder(s).`))
      .catch((error: unknown) => console.error(`Review reminders failed: ${String(error)}`));
  }, reminderHours * 60 * 60 * 1000);
}
