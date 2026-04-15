# Push Bridge Surface

Repo-local contract doc for the retained host-backed push/PR bridge source tree.
This file documents the current bounded runtime surface used by `plugin-host-git-push/`.
It is not currently shipped in the packaged file list.

## Tool entry

Preferred tool names:
- `git_push_bridge_action`
- `git_pr_bridge_action`

## Contract

```json
{
  "action": "inspect-capabilities" | "push-current-branch" | "assert-pr-ready" | "create-pr-to-main",
  "command": "<raw skill args>",
  "commandName": "<slash command>",
  "skillName": "openclaw-host-git-push" | "openclaw-host-git-pr",
  "timeoutMs": 600000
}
```

Canonical request shape:
- `skillName` must be exactly `openclaw-host-git-push` or `openclaw-host-git-pr`
- `commandName` should be `/git-push` for push actions and `/git-pr` for PR actions
- `action=inspect-capabilities` and `action=assert-pr-ready` are the read-only preflight paths
- `action=push-current-branch` and `action=create-pr-to-main` are the only write paths
- `command` is audit/context text from the skill invocation, not a free-form git or shell passthrough surface
- `timeoutMs` only controls how long the bridge waits for a typed result after job creation

Accepted intent mapping:
- `/git-push current-branch` -> `action=push-current-branch`
- push capability/preflight check -> `action=inspect-capabilities`
- `/git-pr create` -> `action=create-pr-to-main`
- PR readiness/preflight check -> `action=assert-pr-ready`

Anything outside that contract should be treated as out of scope for this bridge rather than silently widening behavior.

## Behavior

### `inspect-capabilities`
- read structured capability state from the validated core-side helper path
- return `push` and `pr` readiness separately
- surface the short blocked remediation text as-is when either path is blocked
- do not write any push job

### `push-current-branch`
- run capability preflight first
- if `push.ready !== true`, stop and return the blocked response without writing any job
- keep blocked push state separate from blocked PR state
- collect current repo branch/head/remote
- write a typed `push_current_branch` job to the host-jobs spool
- wait for `results/<jobId>.json`
- return the structured result

### `assert-pr-ready`
- read structured capability state first
- return the `pr` blocked or ready state directly
- keep the reported `push` state separate for context
- do not write any job
- treat green host-backed readiness as a capability result only, not as proof that the PR will open if branch/remote state is still wrong

### `create-pr-to-main`
- run capability preflight first
- if `pr.ready !== true`, stop and return the blocked response without writing any job
- keep blocked PR state separate from push state
- collect current repo branch/head/remote
- write a typed `create_pull_request` job to the host-jobs spool
- restrict base branch to `main`
- use the current branch as the head branch
- wait for `results/<jobId>.json`
- return the structured result
- preserve downstream repo-state failures honestly, for example when GitHub reports no commits between `main` and the head branch or the head ref is not visible as a branch

## Source vs generated artifacts

Canonical source in this subtree:
- `openclaw.plugin.json`
- `package.json`
- `index.ts`
- `api.ts`
- `src/*.ts`
- `BRIDGE_SURFACE.md`
- lockfile and tsconfig files that define reproducible local development/runtime shape

Generated or local-only artifacts that should not be treated as canon for review or commits:
- `dist/`
- `node_modules/`
- temporary packed tarballs or `.pack/` staging directories
- local install/extraction leftovers created during manual verification

## Non-goals

- arbitrary git args
- arbitrary shell execution
- generic host control
