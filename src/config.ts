import { RequestError, type App } from "octokit";
import { parse } from "yaml";

/** Octokit client scoped to one installation, as received by webhook handlers. */
export type GitHub = App["octokit"];

export const CONFIG_PATH = ".github/pr-concierge.yml";

/** Exclusive upper bounds on changed lines; anything at or above `l` is XL. */
export interface SizeThresholds {
  xs: number;
  s: number;
  m: number;
  l: number;
}

export interface ConciergeConfig {
  size: { enabled: boolean; thresholds: SizeThresholds; ignore: string[] };
  checks: { enabled: boolean; minDescriptionLength: number; requireLinkedIssue: boolean; skipBots: boolean };
  reminders: { enabled: boolean; staleAfterDays: number };
}

export const DEFAULT_CONFIG: ConciergeConfig = {
  size: {
    enabled: true,
    thresholds: { xs: 10, s: 30, m: 100, l: 500 },
    ignore: ["**/package-lock.json", "**/pnpm-lock.yaml", "**/*.lock", "**/go.sum", "**/*.min.js", "**/*.snap"],
  },
  checks: { enabled: true, minDescriptionLength: 20, requireLinkedIssue: true, skipBots: true },
  reminders: { enabled: true, staleAfterDays: 3 },
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Overlay user values onto defaults, keeping only known keys whose type matches the default. */
function overlay<T>(defaults: T, user: unknown): T {
  if (!isPlainObject(defaults) || !isPlainObject(user)) return defaults;
  const result: Record<string, unknown> = { ...defaults };
  for (const [key, fallback] of Object.entries(defaults)) {
    const value = user[key];
    if (value === undefined) continue;
    if (isPlainObject(fallback)) {
      result[key] = overlay(fallback, value);
    } else if (Array.isArray(fallback)) {
      if (Array.isArray(value) && value.every((item) => typeof item === "string")) result[key] = value;
    } else if (typeof value === typeof fallback) {
      result[key] = value;
    }
  }
  return result as T;
}

export function mergeConfig(user: unknown): ConciergeConfig {
  const config = overlay(DEFAULT_CONFIG, user);
  const { xs, s, m, l } = config.size.thresholds;
  if (!(0 < xs && xs < s && s < m && m < l)) {
    config.size = { ...config.size, thresholds: DEFAULT_CONFIG.size.thresholds };
  }
  return config;
}

/** Read `.github/pr-concierge.yml` from the default branch, falling back to defaults. */
export async function loadConfig(octokit: GitHub, owner: string, repo: string): Promise<ConciergeConfig> {
  let text: string;
  try {
    const { data } = await octokit.rest.repos.getContent({ owner, repo, path: CONFIG_PATH });
    if (Array.isArray(data) || data.type !== "file" || !("content" in data)) return DEFAULT_CONFIG;
    text = Buffer.from(data.content, "base64").toString("utf8");
  } catch (error) {
    if (error instanceof RequestError && error.status === 404) return DEFAULT_CONFIG;
    throw error;
  }

  try {
    return mergeConfig(parse(text));
  } catch (error) {
    console.warn(`Ignoring invalid ${CONFIG_PATH} in ${owner}/${repo}: ${String(error)}`);
    return DEFAULT_CONFIG;
  }
}
