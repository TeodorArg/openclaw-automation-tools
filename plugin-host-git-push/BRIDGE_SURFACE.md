# Push Bridge Surface

Minimal bounded surface for the host git push bridge.

## Tool entry

Preferred tool name:
- `git_push_bridge_action`

## Contract

```json
{
  "action": "inspect-capabilities" | "push-current-branch",
  "command": "<raw skill args>",
  "commandName": "<slash command>",
  "skillName": "openclaw-host-git-push",
  "timeoutMs": 600000
}
```

Canonical request shape:
- `skillName` must be exactly `openclaw-host-git-push`
- `commandName` should be `/git-push`
- `action=inspect-capabilities` is the read-only preflight path
- `action=push-current-branch` is the only write path
- `command` is audit/context text from the skill invocation, not a free-form git or shell passthrough surface
- `timeoutMs` only controls how long the bridge waits for a typed result after job creation

Accepted intent mapping:
- `/git-push current-branch` -> `action=push-current-branch`
- capability/preflight check -> `action=inspect-capabilities`

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

- PR creation
- arbitrary git args
- arbitrary shell execution
- generic host control
