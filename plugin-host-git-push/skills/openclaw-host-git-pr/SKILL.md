---
name: openclaw-host-git-pr
description: Bounded PR bridge behind the operator-facing `open_pr` intent. Performs host-backed PR readiness checks and opens the current branch into `main` without widening into arbitrary gh passthrough.
user-invocable: true
command-dispatch: tool
command-tool: git_pr_bridge_action
command-arg-mode: raw
---

# OpenClaw Host Git PR

Use this skill only for the bounded PR workflow.

## Supported intents

Canonical operator intent:
- `open_pr`

Typical utterance examples:
- RU: `сделай PR`
- EN: `make a PR`
- EN: `open a PR`
- internal/runtime: normalized `open_pr` routing

## Required behavior

- Run PR capability preflight before writing any PR job.
- If PR readiness is blocked, return the blocked reason and stop without writing any job.
- Keep PR readiness separate from push readiness.
- Never accept arbitrary shell, arbitrary `gh` flags, or arbitrary base/head overrides.
- Treat this skill as opening the current branch into `main`, not as a generic PR wrapper.

## Runtime contract

This skill routes into `git_pr_bridge_action`.
The tool surface is intentionally narrow:
- assert PR readiness
- create a PR from the current branch into `main`

The runtime path must stay bounded to capability preflight plus typed host-jobs spool payloads.
Do not rely on runtime-local `gh` auth, runtime-local GitHub auth, or container-local PR creation for this workflow.
