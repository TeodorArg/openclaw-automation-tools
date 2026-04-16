# Publish Readiness

Date: 2026-04-16
Status: post-reorg readiness baseline

This document tracks whether each classified unit is only materialized or actually ready for publication.

## Unit Status

| Unit | Type | Structural shape | Local verification | Publication metadata | Publish status | Current blocker |
| --- | --- | --- | --- | --- | --- | --- |
| `openclaw-git-workflow/` | plugin + bundled skill | ready | ready | mostly ready | blocked | first external release pass still not recorded |
| `memory-hygiene/` | skill-only | ready | ready | ready | blocked | first ClawHub publish/dry-run not yet recorded |
| `source-of-truth-fix/` | skill-only | ready | ready | ready | blocked | first ClawHub publish/dry-run not yet recorded |
| `openclaw-host-git-pr/` | skill-only | ready | ready | ready | blocked | host-backed runtime dependency stays external and not yet release-validated |
| `host-git-lane/` | companion folder | ready | ready | n/a | not publishable | companion docs only by design |

## Baseline Rules

Skills:
- `SKILL.md` must exist
- `LICENSE` must be package-local and `MIT-0`
- `README.md` must state `slug`, `display name`, `owner`, `version`, and `tags`
- package must not imply plugin runtime code unless it really exists

Plugin packages:
- `package.json` and `openclaw.plugin.json` must agree on version and real package shape
- shipped files must match release intent
- release notes must track `display name`, `owner`, `version`, `changelog`, `source repo`, `source commit`, and `source ref`

Companion folders:
- required docs must exist
- no fake package manifests may appear

## Per-Unit Publish Baseline

### `memory-hygiene/`

- slug: `memory-hygiene`
- display name: `Memory Hygiene`
- owner: `TeodorArg`
- version: `0.1.0`
- tags: `memory`, `workflow`, `maintenance`
- license: `MIT-0`
- publish command:

```bash
clawhub skill publish ./memory-hygiene --slug memory-hygiene --name "Memory Hygiene" --owner TeodorArg --version 0.1.0 --changelog "Initial standalone package release" --tags memory,workflow,maintenance
```

### `source-of-truth-fix/`

- slug: `source-of-truth-fix`
- display name: `Source Of Truth Fix`
- owner: `TeodorArg`
- version: `0.1.0`
- tags: `docs`, `verification`, `source-of-truth`
- license: `MIT-0`
- publish command:

```bash
clawhub skill publish ./source-of-truth-fix --slug source-of-truth-fix --name "Source Of Truth Fix" --owner TeodorArg --version 0.1.0 --changelog "Initial standalone package release" --tags docs,verification,source-of-truth
```

### `openclaw-host-git-pr/`

- slug: `openclaw-host-git-pr`
- display name: `OpenClaw Host Git PR`
- owner: `TeodorArg`
- version: `0.1.0`
- tags: `git`, `github`, `pr`, `host`
- license: `MIT-0`
- publish command:

```bash
clawhub skill publish ./openclaw-host-git-pr --slug openclaw-host-git-pr --name "OpenClaw Host Git PR" --owner TeodorArg --version 0.1.0 --changelog "Initial standalone package release" --tags git,github,pr,host
```

### `openclaw-git-workflow/`

- package name: `@openclaw/openclaw-git-workflow`
- display name: `OpenClaw Git Workflow`
- owner: `TeodorArg`
- version: `0.1.0`
- source repo: `TeodorArg/openclaw-git-workflow`
- source ref: `main`
- release blocker: external install verification is still required before the first public release is treated as ready

## Sources Used

- official GitHub Actions docs via Context7 for matrix job structure
- official OpenClaw docs for plugin manifest/package shape:
  - https://docs.openclaw.ai/plugins
