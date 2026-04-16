---
name: openclaw-git-workflow
description: Main branch-plus-commit workflow behind the operator-facing `send_to_git` intent. Plans git groups for repo changes and, from a confirmed plan, executes only bounded branch + commit steps before a separate push bridge takes over.
user-invocable: true
command-dispatch: tool
command-tool: git_workflow_action
command-arg-mode: raw
---

# OpenClaw Git Workflow

Use this skill for the bounded operator-facing git workflow, not for arbitrary git commands.

## Supported intents

Этот skill должен обрабатывать только канонический операторский интент `send_to_git`.
Точные пользовательские фразы не являются каноном, это только alias layer.
Типовые примеры:
- RU: `отправь в гит`
- RU: `запушь`
- RU: `отправь изменения`
- EN: `send to git`
- EN: `push it`
- EN: `ship to git`

Внутри runtime этот интент по-прежнему раскладывается на стадии plan, confirm, execute.

## Поведение по интенту

### `send_to_git`

Внешне это один операторский интент, но внутри он должен сохранять bounded staged flow:
- inspect repo state and changed files
- propose logical git groups
- propose canonical branch names and commit title/body text
- do not reconstruct execution from free-form user text
- require the confirmed plan format for the write step
- perform only bounded branch + commit actions
- keep execution deterministic around branch base and commit identity
- hand off push to a separate bounded bridge layer
- do not open PRs here

## Hard rules

- Do not accept arbitrary `git <anything>` input.
- Do not pass user text through to shell.
- Keep alias/intent routing separate from the internal execution payload.
- Keep planning output separate from execution input.
- If confirmed plan input is missing or invalid, stop execute and return a clear error.
- Keep branch naming and commit format aligned with the target repo conventions and `GIT_GUIDANCE.md`.

## Runtime shape

This skill uses deterministic tool dispatch.
The tool receives raw command args and translates them into a structured request.
Scripts under `plugin/scripts/` must not parse free-form user text.

## Boundary

This skill covers only:
- the skill entrypoint
- confirmed plan handoff
- the bounded execute surface
- bounded branch/commit execution

It does not cover:
- push
- PR creation
- generic shell passthrough
- destructive recovery flows
- always-on helper processes
