# openclaw-automation-tools

OpenClaw plugins for real work, not toy demos.

This repository is a curated OpenClaw development stack: five focused plugins that help turn AI-assisted work into something more structured, more reliable, and much easier to ship.

Together, they help you keep a real execution plan, start faster from live references, protect long sessions from going soft, keep repo truth aligned, and close the loop from working branch to merged result.

If you want OpenClaw to do more than chat, this repo is where the practical tooling lives.

This repo currently ships five publishable plugin packages:
- `openclaw-host-git-workflow/`
- `openclaw-workflow-planner/`
- `openclaw-canon/`
- `openclaw-session-bloat-warning/`
- `openclaw-url-tailwind-scaffold/`

## Why This Repo Exists

OpenClaw becomes much more useful when it can:

- turn vague work into an accepted execution plan
- keep long-running repo truth and memory aligned
- ship changes from branch to PR to merge with guardrails
- warn before a session gets too bloated to stay sharp
- turn a reference URL into a reusable Tailwind starting point

That is the point of this repository: each package adds one concrete capability that helps OpenClaw move from "helpful chat" to "repeatable delivery system."

## Why This Stack Feels Powerful

These plugins are intentionally stronger together than they are alone.

- `openclaw-workflow-planner` gives the work structure.
- `openclaw-url-tailwind-scaffold` gives frontend work a fast starting point.
- `openclaw-session-bloat-warning` protects long sessions before they get sloppy.
- `openclaw-canon` keeps repo truth, docs, and memory aligned.
- `openclaw-host-git-workflow` closes the loop from working branch to merged result.

That combination is the real pitch of the repo: not isolated tools, but a curated development stack that gives OpenClaw a serious boost as an execution engine.

It is a strong setup for people who want OpenClaw to become a serious co-driver for development, not just a chat window with good intentions.

## The Plugin Lineup

| Plugin | What it does | Best for |
| --- | --- | --- |
| [`@openclaw/openclaw-host-git-workflow`](./openclaw-host-git-workflow/README.md) | Turns current-branch work into a guarded path through doctor, preflight, PR, checks, merge, and `main` sync. | Real repositories where wrong-branch or wrong-repo shipping mistakes are expensive. |
| [`@openclaw/openclaw-workflow-planner`](./openclaw-workflow-planner/README.md) | Turns rough requests into accepted plans, tracked tasks, and implementation-ready handoff in one readable `WORKFLOW_PLAN.md`. | Multi-step work that must survive longer than one chat session. |
| [`@openclaw/openclaw-canon`](./openclaw-canon/README.md) | Keeps docs, memory, and repo truth aligned with diagnosis-first reports and bounded fixes. | Long-running workspaces where source-of-truth drift causes confusion and rework. |
| [`@openclaw/openclaw-session-bloat-warning`](./openclaw-session-bloat-warning/README.md) | Warns early about compaction pressure, timeout risk, lane pressure, and no-reply streaks before long AI work slows down. | Coding, debugging, research, or orchestration sessions with a lot of context. |
| [`@openclaw/openclaw-url-tailwind-scaffold`](./openclaw-url-tailwind-scaffold/README.md) | Turns a reference page URL into a bounded Tailwind CSS v4 scaffold summary or structured page contract. | Frontend work that starts from a visual reference instead of a blank page. |

## On ClawHub

- [`openclaw-host-git-workflow`](https://clawhub.ai/plugins/%40openclaw%2Fopenclaw-host-git-workflow)
- [`openclaw-workflow-planner`](https://clawhub.ai/plugins/%40openclaw%2Fopenclaw-workflow-planner)
- [`openclaw-canon`](https://clawhub.ai/plugins/%40openclaw%2Fopenclaw-canon)
- [`openclaw-session-bloat-warning`](https://clawhub.ai/plugins/%40openclaw%2Fopenclaw-session-bloat-warning)
- [`openclaw-url-tailwind-scaffold`](https://clawhub.ai/plugins/%40openclaw%2Fopenclaw-url-tailwind-scaffold)

## Why Install These Plugins

Most OpenClaw setups hit the same ceiling: chat is easy, but delivery gets messy.

These packages close that gap:

- planning stops living in scattered prompts and temporary notes
- shipping stops depending on improvised git/gh command chains
- repo truth stops drifting across docs, memory, and package lists
- long sessions become easier to manage before they degrade
- frontend inspiration turns into a usable scaffold much faster

In short: this repo gives OpenClaw operational memory, safer execution, and better follow-through.

It is a strong setup if you want OpenClaw to act less like a chat assistant and more like a practical co-driver for development.

It is also a very good "starter stack" for anyone who wants OpenClaw to become a real development environment multiplier instead of a one-off helper.

## Start Here

Most users should not start by cloning the whole repository. Start by installing the plugin that matches the job.

### What You Need

- An OpenClaw environment where plugins can be installed and enabled.
- Node.js if you want to build from source locally.
- A paired host node only if you want real host-backed git and GitHub execution through `openclaw-host-git-workflow`.

### Install From ClawHub

```bash
openclaw plugins install clawhub:@openclaw/openclaw-host-git-workflow
openclaw plugins install clawhub:@openclaw/openclaw-workflow-planner
openclaw plugins install clawhub:@openclaw/openclaw-canon
openclaw plugins install clawhub:@openclaw/openclaw-session-bloat-warning
openclaw plugins install clawhub:@openclaw/openclaw-url-tailwind-scaffold
```

### Install From A Local Checkout

If you want to develop or inspect a package locally:

```bash
git clone https://github.com/openclaw/openclaw-automation-tools.git
cd openclaw-automation-tools
nvm use || nvm install
cd <package>
pnpm install
pnpm build
cd ..
openclaw plugins install -l ./<package>
```

Replace `<package>` with one of:

- `openclaw-host-git-workflow`
- `openclaw-workflow-planner`
- `openclaw-canon`
- `openclaw-session-bloat-warning`
- `openclaw-url-tailwind-scaffold`

## What Using These Feels Like

- `openclaw-host-git-workflow`: "Ship my current branch safely, open the PR, wait for checks, merge it, and sync main."
- `openclaw-workflow-planner`: "Take this vague request and turn it into a real plan with tasks and an implementation brief."
- `openclaw-canon`: "Show me where docs, memory, and repo truth drifted before it turns into cleanup pain."
- `openclaw-session-bloat-warning`: "Warn me before this session gets too heavy for another big phase."
- `openclaw-url-tailwind-scaffold`: "Use this page as the reference and give me a reusable Tailwind shell to build from."

## A Strong Default Flow

One high-leverage way to use this stack:

1. Start with `openclaw-workflow-planner` to turn the request into a real execution plan.
2. Use `openclaw-url-tailwind-scaffold` when the work starts from a visual reference.
3. Let `openclaw-session-bloat-warning` watch session quality during long implementation work.
4. Run `openclaw-canon` before handoff or release to catch drift early.
5. Finish with `openclaw-host-git-workflow` to ship safely from branch to PR to merge.

That is where the boost comes from: less prompt chaos, less context loss, less drift, and a cleaner path from idea to shipped result.

## How To Choose

Install `openclaw-host-git-workflow` if your biggest problem is safe shipping from a real repo.

Install `openclaw-workflow-planner` if your biggest problem is losing structure between idea, plan, tasks, and implementation.

Install `openclaw-canon` if your biggest problem is drift between repo truth, docs, and memory.

Install `openclaw-session-bloat-warning` if your biggest problem is long sessions getting slower, noisier, or more fragile over time.

Install `openclaw-url-tailwind-scaffold` if your biggest problem is turning design references into a practical frontend starting point.

## Technical Docs

The root README stays intentionally focused on orientation. Technical policy, runtime details, publish workflow, and maintainer guidance live in `docs/`.

- [Technical docs map](./docs/README.md)
- [Plugin package canon](./docs/PLUGIN_PACKAGE_CANON.md)
- [Plugin style canon](./docs/PLUGIN_STYLE_CANON.md)
- [Node install and identity contract](./docs/OPENCLAW_NODE_INSTALL_AND_IDENTITY_CONTRACT.md)
- [ClawHub publish preflight](./docs/CLAWHUB_PUBLISH_PREFLIGHT.md)
- [Release records](./docs/RELEASES.md)

## For Maintainers

This repository is a multi-package OpenClaw workspace, not a single root package.

- each publishable plugin keeps its own `README.md`, `package.json`, `openclaw.plugin.json`, build, tests, and packaged artifact rules
- repo-level package canon lives in [`docs/PLUGIN_PACKAGE_CANON.md`](./docs/PLUGIN_PACKAGE_CANON.md)
- the root repo does not ship a single shared plugin entrypoint
- package-level verification should run inside the package being changed, with the detailed maintainer flow documented in [`docs/README.md`](./docs/README.md)

## Repo Structure

```text
openclaw-host-git-workflow/
openclaw-workflow-planner/
openclaw-canon/
openclaw-session-bloat-warning/
openclaw-url-tailwind-scaffold/
docs/
```
