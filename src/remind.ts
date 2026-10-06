// One-shot reminder run for cron jobs or scheduled workflows: `npm run remind`.
import { existsSync } from "node:fs";
import { createApp } from "./app.js";
import { remindStaleReviews } from "./reminders.js";

if (existsSync(".env")) process.loadEnvFile(".env");

const sent = await remindStaleReviews(createApp());
console.log(`Sent ${sent} review reminder(s).`);
