# PR Concierge

A GitHub App that keeps pull requests easy to review:

- **Size labels**: labels every PR `size/XS` … `size/XL` by lines changed, ignoring lockfiles and generated files.
- **Hygiene checklist**: posts one comment listing what's missing (description, linked issue, reviewable size) and updates that same comment as the PR changes. PRs that already pass get no comment.
- **Stale review reminders**: nudges pending reviewers when a PR has had no activity for a few days.

Each repository can tune or turn off any feature with [`.github/pr-concierge.yml`](.github/pr-concierge.yml).

```markdown
### 🛎️ PR Concierge: 2 items need attention

- [ ] **Has a description**: Explain what changed and why (at least 20 characters).
- [ ] **Links an issue**: Add `Fixes #123` to the description, or link an issue from the sidebar.
- [x] Reviewable size
```

## Quick start

Requires Node.js 22 or newer.

```bash
npm install
npm run setup
```

1. Open <http://localhost:3000> and click **Register GitHub App**. GitHub creates a private app with the right permissions, and the credentials are saved to `.env` and `private-key.pem` (both git-ignored).
2. Click **Install it on a repository** and choose a test repository.
3. Start the app: `npm run dev`. A [smee.io](https://smee.io) channel relays GitHub's webhooks to your machine.
4. Open a pull request in that repository and watch the label and checklist appear.

To register the app under an organization instead of your personal account, run `GITHUB_ORG=my-org npm run setup`.

## Permissions and events

| Permission    | Access       | Why                                          |
| ------------- | ------------ | -------------------------------------------- |
| Pull requests | Read & write | Read changed files, add size labels          |
| Issues        | Read & write | Create labels, post and update comments      |
| Contents      | Read-only    | Read `.github/pr-concierge.yml`              |
| Metadata      | Read-only    | Required by GitHub for every app             |

Subscribed event: `pull_request` (opened, reopened, synchronize, edited, ready_for_review).

## Stale review reminders

Reminders run on a schedule, not on webhooks. Choose one:

- **On Vercel**: set `CRON_SECRET`. [`vercel.json`](vercel.json) schedules `GET /cron/remind` on weekdays around 09:00 UTC.
- **In a long-running server process**: set `REMINDER_INTERVAL_HOURS=24`.
- **From cron or a scheduled workflow**: run `npm run remind`. For example, in a scheduled GitHub Actions workflow:

  ```yaml
  on:
    schedule:
      - cron: "0 9 * * 1-5" # weekdays 09:00 UTC
  jobs:
    remind:
      runs-on: ubuntu-latest
      steps:
        - uses: actions/checkout@v7
        - uses: actions/setup-node@v7
          with: { node-version: 24, cache: npm }
        - run: npm ci && npm run remind
          env:
            APP_ID: ${{ secrets.APP_ID }}
            PRIVATE_KEY: ${{ secrets.PRIVATE_KEY }}
            WEBHOOK_SECRET: ${{ secrets.WEBHOOK_SECRET }}
  ```

A reminder counts as activity on the PR, so each PR is nudged at most once per stale period.

## Deploying

### Vercel (free Hobby plan)

Vercel runs `src/server.ts` as a serverless function, so no code changes are needed.

```bash
npx vercel link
npx vercel env add APP_ID production
npx vercel env add PRIVATE_KEY production < private-key.pem
npx vercel env add WEBHOOK_SECRET production
npx vercel env add CRON_SECRET production
npx vercel deploy --prod
```

### Docker (any host)

```bash
docker build -t pr-concierge .
docker run -p 3000:3000 -e APP_ID=... -e PRIVATE_KEY="$(cat private-key.pem)" -e WEBHOOK_SECRET=... pr-concierge
```

After deploying, go to your app's settings on GitHub and set **Webhook URL** to `https://<your-host>/api/github/webhooks`. Don't set `WEBHOOK_PROXY_URL` in production. `GET /health` returns `{"status":"ok"}` for uptime checks.

| Variable                  | Required | Description                                                  |
| ------------------------- | -------- | ------------------------------------------------------------ |
| `APP_ID`                  | yes      | GitHub App ID                                                |
| `PRIVATE_KEY` or `PRIVATE_KEY_PATH` | yes | App private key (inline with `\n`, or a file path)   |
| `WEBHOOK_SECRET`          | yes      | Secret used to verify webhook signatures                     |
| `PORT`                    | no       | HTTP port (default `3000`)                                   |
| `REMINDER_INTERVAL_HOURS` | no       | Run reminders every N hours in-process (default off)         |
| `CRON_SECRET`             | no       | Enables `GET /cron/remind`, authorized with `Bearer <secret>` |
| `WEBHOOK_PROXY_URL`       | dev only | smee.io channel to relay webhooks locally                    |
| `GITHUB_API_URL`          | no       | GitHub Enterprise Server API, e.g. `https://ghe.example.com/api/v3` |

## Development

```bash
npm test          # unit tests + end-to-end webhook tests against a stand-in GitHub API
npm run typecheck
npm run build     # compiles to dist/
```

| Path                | What's there                                              |
| ------------------- | --------------------------------------------------------- |
| `src/github-app.ts` | Builds the GitHub App and wires webhook events            |
| `src/review.ts`     | Size labelling and checklist comment (GitHub API calls)   |
| `src/size.ts`, `src/checks.ts`, `src/config.ts` | Pure logic: sizing, checks, config merging |
| `src/reminders.ts`  | Stale review reminders across all installations           |
| `src/http.ts`, `src/server.ts` | HTTP server, smee relay, reminder scheduler    |
| `src/setup.ts`      | One-click registration via the GitHub App manifest flow   |

## Support

Questions or bugs: open an issue, or email **bjaymakara@gmail.com** <!-- TODO: replace with your support address -->.
