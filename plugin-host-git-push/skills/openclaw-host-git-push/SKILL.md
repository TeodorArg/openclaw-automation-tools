---
name: openclaw-host-git-push
description: Bounded push bridge used by the operator-facing `send_to_git` flow. Pushes the current branch through the validated host-side Plan A path after capability preflight, while keeping push-via-SSH-agent separate from PR-via-gh state.
user-invocable: true
command-dispatch: tool
command-tool: git_push_bridge_action
command-arg-mode: raw
---

# OpenClaw Host Git Push

Use this skill only for the bounded `push current branch` workflow.

## Supported intents

Canonical operator intent context:
- `send_to_git`

Typical utterance examples that may route here after planning and execute:
- RU: `отправь в гит`
- RU: `запушь`
- RU: `отправь изменения`
- EN: `send to git`
- EN: `push it`
- EN: `ship to git`
- internal/runtime: `push current branch`

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
Do not rely on runtime-local git auth, runtime-local SSH, or runtime-local GitHub auth for this workflow.
