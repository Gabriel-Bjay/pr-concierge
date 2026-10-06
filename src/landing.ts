// Product page served at `/`. Plain HTML and CSS, so it can be edited without a build step.
const SUPPORT_EMAIL = "bjaymakara@gmail.com";
const CONTACT_URL = `mailto:${SUPPORT_EMAIL}?subject=PR%20Concierge`;

const ICONS = {
  bell: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.6 2.6A2 2 0 0 0 11.2 2H4a2 2 0 0 0-2 2v7.2a2 2 0 0 0 .6 1.4l8.7 8.7a2.4 2.4 0 0 0 3.4 0l6.6-6.6a2.4 2.4 0 0 0 0-3.4z"/><circle cx="7.5" cy="7.5" r="1.5"/></svg>`,
  checklist: `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m3 7 2 2 4-4"/><path d="m3 15 2 2 4-4"/><path d="M13 6h8"/><path d="M13 14h8"/><path d="M13 20h8"/></svg>`,
};

export const LANDING_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>PR Concierge</title>
  <meta name="description" content="A GitHub App that labels pull requests by size, points out what's missing, and reminds reviewers about stale reviews.">
  <link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ctext y='.9em' font-size='90'%3E%F0%9F%9B%8E%EF%B8%8F%3C/text%3E%3C/svg%3E">
  <style>
    :root {
      color-scheme: light dark;
      --bg: #ffffff;
      --bg-subtle: #f7f7f5;
      --fg: #1c1917;
      --fg-muted: #57534e;
      --border: #e7e5e4;
      --border-strong: #a8a29e;
      --accent: #b45309;
      --accent-hover: #92400e;
      --accent-fg: #ffffff;
      --accent-subtle: #fef3c7;
      --accent-text: #92400e;
      --success: #15803d;
      --code-bg: rgb(120 113 108 / 0.15);
      --block-bg: #1c1917;
      --block-fg: #e7e5e4;
      --shadow: 0 16px 40px -24px rgb(28 25 23 / 0.35);
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --bg: #0c0a09;
        --bg-subtle: #1c1917;
        --fg: #fafaf9;
        --fg-muted: #a8a29e;
        --border: #292524;
        --border-strong: #57534e;
        --accent: #f59e0b;
        --accent-hover: #fbbf24;
        --accent-fg: #1c1917;
        --accent-subtle: rgb(245 158 11 / 0.14);
        --accent-text: #fbbf24;
        --success: #16a34a;
        --code-bg: rgb(168 162 158 / 0.15);
        --block-bg: #1c1917;
        --block-fg: #e7e5e4;
        --shadow: 0 16px 40px -24px rgb(0 0 0 / 0.8);
      }
    }
    *, *::before, *::after { box-sizing: border-box; }
    body {
      margin: 0;
      background: var(--bg);
      color: var(--fg);
      font: 16px/1.6 -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif;
      -webkit-text-size-adjust: 100%;
    }
    a { color: var(--accent-text); }
    a:focus-visible, .btn:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; border-radius: 6px; }
    code, pre { font-family: ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, monospace; }
    code { font-size: 0.875em; background: var(--code-bg); padding: 0.1em 0.35em; border-radius: 4px; }

    .wrap { max-width: 1040px; margin: 0 auto; padding: 0 16px; }
    @media (min-width: 720px) { .wrap { padding: 0 24px; } }

    .site-header { border-bottom: 1px solid var(--border); }
    .site-header .wrap { display: flex; align-items: center; justify-content: space-between; gap: 16px; height: 64px; }
    .brand { display: flex; align-items: center; gap: 10px; font-weight: 650; color: var(--fg); text-decoration: none; }
    .brand-mark { width: 32px; height: 32px; border-radius: 8px; display: grid; place-items: center; background: var(--accent-subtle); color: var(--accent-text); }
    .site-nav { display: flex; gap: 20px; font-size: 14px; }
    .site-nav a { color: var(--fg-muted); text-decoration: none; }
    .site-nav a:hover { color: var(--fg); }
    @media (max-width: 640px) { .site-nav a:not(:last-child) { display: none; } }

    .hero { padding: 64px 0 56px; }
    .hero .wrap { display: grid; gap: 48px; align-items: center; }
    @media (min-width: 880px) { .hero .wrap { grid-template-columns: 1.1fr 1fr; } .hero { padding: 88px 0 72px; } }
    .eyebrow { font-size: 13px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--accent-text); margin: 0; }
    h1 { font-size: clamp(34px, 5.2vw, 52px); line-height: 1.08; letter-spacing: -0.025em; margin: 12px 0 18px; text-wrap: balance; }
    .lede { font-size: 18px; color: var(--fg-muted); max-width: 34em; margin: 0 0 28px; }
    .actions { display: flex; flex-wrap: wrap; gap: 12px; }
    .btn { display: inline-flex; align-items: center; justify-content: center; min-height: 44px; padding: 0 20px; border-radius: 8px; font-weight: 600; font-size: 15px; text-decoration: none; border: 1px solid transparent; }
    .btn-primary { background: var(--accent); color: var(--accent-fg); }
    .btn-primary:hover { background: var(--accent-hover); }
    .btn-secondary { border-color: var(--border); color: var(--fg); }
    .btn-secondary:hover { background: var(--bg-subtle); }
    .note { font-size: 14px; color: var(--fg-muted); margin: 16px 0 0; }

    .mock { border: 1px solid var(--border); border-radius: 14px; background: var(--bg-subtle); padding: 16px; display: grid; gap: 12px; box-shadow: var(--shadow); }
    .mock-title { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; font-weight: 600; margin: 0; }
    .mock-title .num { color: var(--fg-muted); font-weight: 400; }
    .label { display: inline-block; font-size: 12px; font-weight: 600; line-height: 22px; padding: 0 9px; border-radius: 999px; white-space: nowrap; }
    .size-xs { background: #3cbf00; color: #0a2200; }
    .size-s { background: #5d9801; color: #0d1a00; }
    .size-m { background: #7f7203; color: #ffffff; }
    .size-l { background: #a14c05; color: #ffffff; }
    .size-xl { background: #c32607; color: #ffffff; }
    .comment { background: var(--bg); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
    .comment-head { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-subtle); border-bottom: 1px solid var(--border); font-size: 13px; color: var(--fg-muted); }
    .comment-head strong { color: var(--fg); }
    .avatar { width: 20px; height: 20px; border-radius: 50%; display: grid; place-items: center; background: var(--accent-subtle); color: var(--accent-text); }
    .avatar svg { width: 12px; height: 12px; }
    .bot { border: 1px solid var(--border); border-radius: 999px; padding: 0 6px; font-size: 11px; line-height: 18px; }
    .comment-body { padding: 12px 14px; font-size: 14px; }
    .comment-body p { margin: 0; }
    .comment-title { font-weight: 650; margin: 0 0 10px; }
    .checklist { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; }
    .checklist li { position: relative; padding-left: 26px; }
    .checklist li::before { content: ""; position: absolute; left: 0; top: 3px; width: 16px; height: 16px; border-radius: 4px; border: 1.5px solid var(--border-strong); }
    .checklist li.done::before { background: var(--success); border-color: var(--success); }
    .checklist li.done::after { content: ""; position: absolute; left: 5.5px; top: 5.5px; width: 5px; height: 9px; border: solid #ffffff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

    section { padding: 64px 0; border-top: 1px solid var(--border); }
    h2 { font-size: clamp(26px, 3.4vw, 32px); line-height: 1.2; letter-spacing: -0.015em; margin: 0 0 10px; }
    .section-lede { color: var(--fg-muted); margin: 0 0 32px; max-width: 40em; }
    .grid { display: grid; gap: 16px; }
    @media (min-width: 880px) { .grid, .promises { grid-template-columns: repeat(3, 1fr); } }
    .card { border: 1px solid var(--border); border-radius: 14px; padding: 24px; }
    .card h3 { margin: 16px 0 8px; font-size: 18px; }
    .card p { margin: 0; color: var(--fg-muted); }
    .icon { width: 40px; height: 40px; border-radius: 10px; display: grid; place-items: center; background: var(--accent-subtle); color: var(--accent-text); }
    .sizes { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 16px; }

    .split { display: grid; gap: 32px; align-items: start; }
    @media (min-width: 880px) { .split { grid-template-columns: 1fr 1.15fr; } }
    .split p { color: var(--fg-muted); margin: 0 0 16px; }
    pre { margin: 0; padding: 20px; border-radius: 14px; border: 1px solid var(--border); background: var(--block-bg); color: var(--block-fg); overflow-x: auto; font-size: 14px; line-height: 1.7; }
    pre code { background: none; padding: 0; font-size: inherit; }
    .y-key { color: #fbbf24; }
    .y-str { color: #86efac; }
    .y-num { color: #93c5fd; }
    .y-cmt { color: #a8a29e; }

    .table-wrap { overflow-x: auto; border: 1px solid var(--border); border-radius: 14px; }
    table { width: 100%; border-collapse: collapse; font-size: 15px; }
    th, td { text-align: left; padding: 12px 16px; border-bottom: 1px solid var(--border); vertical-align: top; }
    th { background: var(--bg-subtle); font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--fg-muted); font-weight: 600; }
    tr:last-child td { border-bottom: 0; }
    td:nth-child(2) { white-space: nowrap; }
    .promises { list-style: none; padding: 0; margin: 24px 0 0; display: grid; gap: 12px 24px; }
    .promises li { position: relative; padding-left: 28px; color: var(--fg-muted); }
    .promises li strong { color: var(--fg); }
    .promises li::before { content: ""; position: absolute; left: 0; top: 4px; width: 18px; height: 18px; border-radius: 50%; background: var(--success); }
    .promises li::after { content: ""; position: absolute; left: 6.5px; top: 7.5px; width: 5px; height: 9px; border: solid #ffffff; border-width: 0 2px 2px 0; transform: rotate(45deg); }

    .cta { text-align: center; }
    .cta .section-lede { margin: 0 auto 28px; }
    .cta .actions { justify-content: center; }

    .site-footer { border-top: 1px solid var(--border); padding: 28px 0; font-size: 14px; color: var(--fg-muted); }
    .site-footer .wrap { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 12px; }
  </style>
</head>
<body>
  <header class="site-header">
    <div class="wrap">
      <a class="brand" href="/"><span class="brand-mark">${ICONS.bell}</span>PR Concierge</a>
      <nav class="site-nav" aria-label="Sections">
        <a href="#features">Features</a>
        <a href="#configure">Configure</a>
        <a href="#permissions">Permissions</a>
        <a href="#contact">Contact</a>
      </nav>
    </div>
  </header>

  <main>
    <div class="hero">
      <div class="wrap">
        <div>
          <p class="eyebrow">GitHub App</p>
          <h1>Pull requests that are ready for review</h1>
          <p class="lede">PR Concierge labels every pull request by size, points out what's missing before a reviewer has to ask, and reminds reviewers when a pull request has gone quiet.</p>
          <div class="actions">
            <a class="btn btn-primary" href="${CONTACT_URL}">Get in touch</a>
            <a class="btn btn-secondary" href="#features">See how it works</a>
          </div>
          <p class="note">In early access. Get in touch if you'd like it on your repositories.</p>
        </div>

        <div class="mock" role="img" aria-label="Example pull request with a size/M label and a PR Concierge checklist comment">
          <p class="mock-title">Add retry with backoff to the sync worker <span class="num">#42</span> <span class="label size-m">size/M</span></p>
          <div class="comment">
            <div class="comment-head"><span class="avatar">${ICONS.bell}</span><strong>pr-concierge</strong><span class="bot">bot</span><span>commented</span></div>
            <div class="comment-body">
              <p class="comment-title">PR Concierge: 1 item needs attention</p>
              <ul class="checklist">
                <li class="done">Has a description</li>
                <li><strong>Links an issue</strong>: add <code>Fixes #123</code> to the description</li>
                <li class="done">Reviewable size</li>
              </ul>
            </div>
          </div>
          <div class="comment">
            <div class="comment-body"><p>👋 <strong>@ada</strong>: this pull request has been waiting on your review for 3 days.</p></div>
          </div>
        </div>
      </div>
    </div>

    <section id="features">
      <div class="wrap">
        <h2>What it does</h2>
        <p class="section-lede">Three small habits that make pull requests faster to review, applied automatically on every repository you install it on.</p>
        <div class="grid">
          <div class="card">
            <div class="icon">${ICONS.tag}</div>
            <h3>Size labels</h3>
            <p>Every pull request gets a label from XS to XL based on the lines it changes. Lockfiles, snapshots and minified files don't count.</p>
            <div class="sizes">
              <span class="label size-xs">size/XS</span>
              <span class="label size-s">size/S</span>
              <span class="label size-m">size/M</span>
              <span class="label size-l">size/L</span>
              <span class="label size-xl">size/XL</span>
            </div>
          </div>
          <div class="card">
            <div class="icon">${ICONS.checklist}</div>
            <h3>A checklist, not a lecture</h3>
            <p>One comment lists what's missing: a description, a linked issue, a reviewable size. It updates in place as the pull request changes, and pull requests that are already in good shape get no comment at all.</p>
          </div>
          <div class="card">
            <div class="icon">${ICONS.bell}</div>
            <h3>Review reminders</h3>
            <p>When reviewers are requested and a pull request sits idle for a few days, PR Concierge mentions them once. The reminder counts as activity, so nobody is nudged twice in a row.</p>
          </div>
        </div>
      </div>
    </section>

    <section id="configure">
      <div class="wrap split">
        <div>
          <h2>Configure it per repository</h2>
          <p>Everything works out of the box. To change thresholds, ignore more paths or turn a feature off, commit <code>.github/pr-concierge.yml</code> to the repository's default branch.</p>
          <p>Every key is optional, and anything you leave out keeps its default.</p>
        </div>
<pre><code><span class="y-cmt"># .github/pr-concierge.yml</span>
<span class="y-key">size</span>:
  <span class="y-key">thresholds</span>: { <span class="y-key">xs</span>: <span class="y-num">10</span>, <span class="y-key">s</span>: <span class="y-num">30</span>, <span class="y-key">m</span>: <span class="y-num">100</span>, <span class="y-key">l</span>: <span class="y-num">500</span> }
  <span class="y-key">ignore</span>: [<span class="y-str">"**/package-lock.json"</span>, <span class="y-str">"dist/**"</span>]
<span class="y-key">checks</span>:
  <span class="y-key">minDescriptionLength</span>: <span class="y-num">20</span>
  <span class="y-key">requireLinkedIssue</span>: <span class="y-num">true</span>
<span class="y-key">reminders</span>:
  <span class="y-key">staleAfterDays</span>: <span class="y-num">3</span></code></pre>
      </div>
    </section>

    <section id="permissions">
      <div class="wrap">
        <h2>What it can access</h2>
        <p class="section-lede">PR Concierge asks only for the permissions it needs. Its read-only access to repository contents is used solely to load its config file.</p>
        <div class="table-wrap">
          <table>
            <thead><tr><th scope="col">Permission</th><th scope="col">Access</th><th scope="col">Used for</th></tr></thead>
            <tbody>
              <tr><td>Pull requests</td><td>Read &amp; write</td><td>Reading which files changed, adding size labels</td></tr>
              <tr><td>Issues</td><td>Read &amp; write</td><td>Creating labels, posting and updating its comment</td></tr>
              <tr><td>Contents</td><td>Read-only</td><td>Reading <code>.github/pr-concierge.yml</code></td></tr>
              <tr><td>Metadata</td><td>Read-only</td><td>Required for every GitHub App</td></tr>
            </tbody>
          </table>
        </div>
        <ul class="promises">
          <li><strong>No database.</strong> It handles each event as it arrives and keeps nothing between events.</li>
          <li><strong>Never writes code.</strong> It can't push commits, merge pull requests or change settings.</li>
          <li><strong>Verified requests only.</strong> Every webhook's signature is checked before anything runs.</li>
        </ul>
      </div>
    </section>

    <section id="contact" class="cta">
      <div class="wrap">
        <h2>Questions or feedback?</h2>
        <p class="section-lede">Get in touch for help, bug reports, or to try PR Concierge on your repositories.</p>
        <div class="actions"><a class="btn btn-primary" href="${CONTACT_URL}">${SUPPORT_EMAIL}</a></div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="wrap">
      <span>PR Concierge</span>
      <span>Built on the GitHub API · <a href="${CONTACT_URL}">Support</a></span>
    </div>
  </footer>
</body>
</html>
`;
