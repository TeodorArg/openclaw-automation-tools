---
name: openclaw-git-workflow
description: Plans git groups for repo changes and, from a confirmed plan, executes only bounded branch + commit steps.
user-invocable: true
command-dispatch: tool
command-tool: git_workflow_action
command-arg-mode: raw
---

# OpenClaw Git Workflow

Use this skill for the bounded operator-facing git workflow, not for arbitrary git commands.

## Supported intents

This skill supports exactly these user-facing workflow intents:

1. `разложи по git-группам`
2. `разложи по git-группам с ветками`
3. `выполни git-группы с ветками`

## Intent behavior

### `разложи по git-группам`

Plan only:
- inspect repo state and changed files
- propose logical git groups
- propose canonical commit title and commit body text
- do not create branches
- do not create commits
- do not push

### `разложи по git-группам с ветками`

Plan only, branch-aware:
- do the normal planning work
- propose branch names
- emit the exact next confirmation step
- emit a ready-to-confirm structured plan
- do not execute writes

### `выполни git-группы с ветками`

Execute only from a confirmed plan:
- do not reconstruct execution from free-form user text
- require the confirmed plan format from the planning step
- perform only bounded branch + commit actions
- keep execution deterministic around branch base and commit identity
- do not push in v1
- do not open PRs

## Hard rules

- Do not accept arbitrary `git <anything>` input.
- Do not pass user text through to shell.
- Keep planning output separate from execution input.
- If confirmed plan input is missing or invalid, stop execute and return a clear error.
- Keep branch naming and commit format aligned with the target repo conventions.

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
