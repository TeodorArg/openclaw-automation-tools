---
name: openclaw-host-git-push
description: Bounded skill for `/git-push current-branch` style behavior. Use when the user wants to push the current branch through the validated host-side Plan A path. Must run capability preflight first, must not write a push job when push readiness is blocked, and must keep push-via-SSH-agent separate from PR-via-gh state.
user-invocable: true
command-dispatch: tool
command-tool: git_push_bridge_action
command-arg-mode: raw
---

# OpenClaw Host Git Push

Use this skill only for the bounded `push current branch` workflow.

## Supported intents

1. `/git-push current-branch`
2. `push current branch`
3. `пушни текущую ветку`

## Required behavior

- Run capability preflight before writing any host git job.
- If push readiness is blocked, return the blocked reason and stop without writing any job.
- Keep push readiness separate from PR readiness.
- Prefer the short blocked remediation alert from capability preflight instead of inventing a broader failure summary.
- Never accept arbitrary shell or arbitrary git args.
- Never treat PR creation as part of this skill.

## Runtime contract

This skill routes into `git_push_bridge_action`.
The tool surface is intentionally narrow:
- inspect capabilities
- push current branch

The runtime path must stay bounded to the host-jobs spool and validated Plan A push path.
