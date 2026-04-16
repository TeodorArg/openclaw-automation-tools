# ClawHub Publish Preflight

Date: 2026-04-16
Status: first-publication preflight baseline

This document defines what must be true before any first real upload from this repo to ClawHub.

## Canon

Official docs used:
- https://docs.openclaw.ai/tools/clawhub
- https://docs.openclaw.ai/plugins

Local CLI observations used:
- `pnpm dlx clawhub --help`
- `pnpm dlx clawhub publish --help`
- `pnpm dlx clawhub package publish --help`
- `pnpm dlx clawhub whoami`

## Important Compatibility Note

Official docs and the currently observed local CLI are close, but not identical.

Official docs currently show:
- `clawhub skill publish <path>` for skills
- `clawhub package publish <source> --dry-run` for plugins

Local observed CLI on this machine:
- `ClawHub CLI v0.9.0`
- exposes `clawhub publish <path>` for skill publishing
- exposes `clawhub package publish <path>` for plugin publishing
- does not expose `--dry-run` for `package publish`
- is currently not logged in

Practical rule:
- verify the installed CLI syntax with `clawhub --help` before the first real publish
- do not assume the docs syntax and local CLI syntax are identical

## Skill Packages

Target skill packages:
- `memory-hygiene/`
- `source-of-truth-fix/`
- `openclaw-host-git-pr/`

### Required Local Checks

For each skill package:
- `SKILL.md` exists
- `README.md` exists
- `LICENSE` exists and is `MIT-0`
- README explicitly includes `slug`, `display name`, `owner`, `version`, `tags`
- no `package.json`
- no `openclaw.plugin.json`
- no `src/`
- no secrets in shipped files

### Publish Commands

If the local CLI exposes the top-level `publish` command:

```bash
clawhub publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
clawhub publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
clawhub publish ./openclaw-host-git-pr --slug openclaw-host-git-pr --name "OpenClaw Host Git PR" --version 0.1.0 --changelog "Initial standalone package release" --tags git,github,pr,host
```

If the installed CLI instead exposes the docs-style syntax:

```bash
clawhub skill publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
clawhub skill publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
clawhub skill publish ./openclaw-host-git-pr --slug openclaw-host-git-pr --name "OpenClaw Host Git PR" --version 0.1.0 --changelog "Initial standalone package release" --tags git,github,pr,host
```

### Current Blocker

- `clawhub whoami` currently returns `Not logged in`

## Plugin Package

Target plugin package:
- `openclaw-git-workflow/`

### Required Local Checks

Run:

```bash
cd openclaw-git-workflow
pnpm lint
pnpm typecheck
pnpm build
pnpm test
pnpm pack:smoke
```

Then verify:
- `package.json` and `openclaw.plugin.json` versions match
- `openclaw.plugin.json` id/name/entry match the actual built package
- package `files` match the intended shipped artifact
- no secrets or host-local paths leak into shipped files
- source provenance is ready:
  - source repo
  - source commit
  - source ref
  - source path

### Current CLI-Compatible Publish Command

```bash
clawhub package publish ./openclaw-git-workflow \
  --family code-plugin \
  --name @openclaw/openclaw-git-workflow \
  --display-name "OpenClaw Git Workflow" \
  --version 0.1.0 \
  --changelog "Initial ClawHub package release" \
  --tags latest,git,workflow \
  --source-repo <github-owner>/<github-repo> \
  --source-commit <git-sha> \
  --source-ref main \
  --source-path openclaw-git-workflow
```

### Current Blockers

- `clawhub whoami` currently returns `Not logged in`
- current local CLI does not expose `package publish --dry-run`
- first external install verification is still not recorded

## Host Git Lane

`host-git-lane/` is not publishable to ClawHub.

What still must be explicit before any repo release:
- this unit remains companion-only and must not be uploaded as a skill or plugin
- the product-level host/node lane must emit stable identity metadata to gateway/UI
- normal host/node sessions should not degrade to `unknown` after a successful handshake

Required operational metadata baseline:
- stable instance id
- display name
- host name
- platform
- client type
- connection status
- disconnect reason when available
- canonical host repo path
- canonical container repo path

## First Upload Checklist

Before the first real ClawHub upload from this repo:
- verify local package/skill checks are green
- verify the installed `clawhub` syntax on the current machine
- verify `clawhub whoami` succeeds
- verify no secrets in the published folder
- verify `owner`, `version`, `tags`, and changelog text
- verify plugin source provenance fields are complete
- verify `host-git-lane/` is excluded from any publish batch
